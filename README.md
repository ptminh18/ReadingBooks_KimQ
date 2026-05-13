<div align="center">

# KimQReading

**An AI-powered book reading web application**  
_Ứng dụng đọc sách thông minh tích hợp AI_

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3-38BDF8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![Express](https://img.shields.io/badge/Express-4-000000?style=flat-square&logo=express)](https://expressjs.com)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)
[![Groq](https://img.shields.io/badge/Groq-Llama3.3-F55036?style=flat-square)](https://groq.com)

[![Live Demo](https://img.shields.io/badge/Live%20Demo-readingbooks--kimq--frontend.onrender.com-6366f1?style=flat-square)](https://readingbooks-kimq-frontend.onrender.com)

## ⚠️ Backend runs on Render free tier — may take ~30s to wake up on first visit. Please wait a moment if books don't load immediately. ⚠️

</div>

---

## English

### What is KimQReading?

KimQReading is a full-stack web application that reimagines how people read books online. Built as a product builder challenge, it demonstrates how AI can enhance every step of the reading experience — from discovering a book to deeply understanding its ideas.

Designed and built from scratch in a few days, it integrates multiple AI services, a real database, voice synthesis, and a clean reading UI to create something that feels like a real product.

### The Problem It Solves

> People buy books but rarely finish them. They lack context, summaries, and someone to explain the hard parts.

KimQReading solves this with:

- AI-generated summaries for every chapter and the whole book
- A voice reading feature so you can listen while doing other things (voice reading works pretty well on both Vietnamese and English)
- An AI chatbot that answers questions about the book like a knowledgeable friend

---

### Features

| Feature                    | Description                                                          |
| -------------------------- | -------------------------------------------------------------------- |
| 📚 **Book Library**        | Browse all books with cover images, author, and category             |
| 📖 **Chapter Reading**     | Clean reading experience with full chapter content                   |
| 🤖 **AI Chapter Summary**  | Each chapter auto-summarized by Groq (Llama 3.3 70B)                 |
| 📝 **AI Book Summary**     | Full book summary synthesized from all chapter summaries             |
| 🔊 **Voice Reading (TTS)** | Listen to any chapter or summary via Edge TTS (Vietnamese & English) |
| 💬 **AI Chat Assistant**   | Ask anything about the book, author, or ideas — context-aware        |

---

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│              React + Vite + TailwindCSS                     │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │ Library  │  │  Book    │  │ Reading  │  │ AI Chat   │  │
│  │  Page    │  │ Overview │  │   View   │  │  Panel    │  │
│  └──────────┘  └──────────┘  └──────────┘  └───────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          │ REST API
┌─────────────────────────▼───────────────────────────────────┐
│                        BACKEND                              │
│                    Express.js API                           │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │/library  │  │/chapters │  │  /chat   │  │   /tts    │  │
│  │          │  │          │  │          │  │           │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬─────┘  │
└───────┼─────────────┼─────────────┼───────────────┼─────────┘
        │             │             │               │
   ┌────▼─────────────▼────┐  ┌─────▼────┐   ┌─────▼──────┐
   │       Supabase        │  │  Groq    │   │  Edge TTS  │
   │  books + chapters +   │  │ Llama3.3 │   │  Python    │
   │     chat_messages     │  │          │   │  vi & en   │
   └───────────────────────┘  └──────────┘   └────────────┘
```

### How Each Feature Works

**Book Library**
Frontend calls `GET /api/library` → backend queries Supabase `books` table → returns cover, title, author, category for the grid.

**Chapter Reading**
Sidebar loads from `GET /api/chapters/:bookId` (titles only). Full content loads on demand via `GET /api/chapters/:bookId/:num` to keep initial load fast.

**AI Chapter Summary**
When a chapter is added via `POST /api/admin/books/:id/chapters`, the backend automatically sends content to Groq (Llama 3.3 70B) and saves the summary to Supabase. Shown when user clicks "Tóm tắt chương".

**AI Book Summary**
`POST /api/admin/books/:id/summarize` fetches all chapter summaries from Supabase, sends them to Groq with a synthesis prompt, and saves the result to `books.book_summary`. Shown in the "Tóm tắt sách" modal.

**Voice Reading (TTS)**
User clicks "Nghe" → frontend POSTs text to `POST /api/tts` → backend writes text to a temp file (handles Vietnamese Unicode correctly) → runs `edge-tts` CLI → streams MP3 back → frontend plays via HTML Audio API. Results are SHA256-cached so the same text is never re-generated.

**AI Chat**
User types a question → frontend sends `{ message, bookId, chapterId, history[] }` → backend builds a system prompt with book info + current chapter excerpt → Groq returns a contextual answer → saved to `chat_messages` table. Responds in the same language the user writes in.

---

### Setup

#### Prerequisites

- Node.js 18+
- Python 3.10+ with `edge-tts` installed
- Supabase account (free)
- Groq API key (free at [console.groq.com](https://console.groq.com))

#### 1. Clone

```bash
git clone https://github.com/ptminh18/ReadingBooks_KimQ.git
cd ReadingBooks_KimQ
```

#### 2. Backend

```bash
cd backend
npm install
pipx install edge-tts   # or: pip install edge-tts
cp .env.example .env    # fill in your keys
npm run dev             # runs on http://localhost:3001
```

`backend/.env`:

```env
PORT=3001
CLIENT_ORIGIN=http://localhost:5173
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
GROQ_API_KEY=gsk_your_key
EDGE_TTS_PATH=/usr/local/bin/edge-tts  # run: which edge-tts
```

#### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev             # runs on http://localhost:5173
```

`frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:3001
```

#### 4. Database

Run `backend/schema.sql` in your Supabase SQL Editor.

#### 5. Add your first book

```bash
cd backend
# Edit BOOK and CHAPTERS in seed.js first
node seed.js
```

Open [http://localhost:5173](http://localhost:5173) 🎉

---

### Adding Books

Books are added manually via the seed script or API:

```bash
# 1. Add book metadata
POST /api/admin/books
{
  "title": "Book Title",
  "author": "Author Name",
  "description": "...",
  "cover_url": "https://...",
  "category": "Self-help",
  "language": "vi",
  "page_count": 300,
  "published_year": 2020
}

# 2. Add chapters (Groq auto-summarizes each one)
POST /api/admin/books/:bookId/chapters
{
  "chapter_number": 1,
  "title": "Chapter Title",
  "content": "Full chapter text..."
}

# 3. Generate whole-book summary
POST /api/admin/books/:bookId/summarize
```

Or use the seed script for bulk adding:

```bash
node seed.js   # edit BOOK and CHAPTERS variables first
```

---

### Deployment

#### Frontend → Render Static Site

1. New → Static Site → connect GitHub repo
2. Root Directory: `frontend`
3. Build Command: `npm install && npm run build`
4. Publish Directory: `dist`
5. Add env var: `VITE_API_BASE_URL=https://your-backend.onrender.com`

#### Backend → Render Web Service

1. New → Web Service → connect GitHub repo
2. Root Directory: `backend`
3. Build Command: `chmod +x build.sh && ./build.sh`
4. Start Command: `node server.js`
5. Add all env vars from `.env`

`backend/build.sh` installs `edge-tts` on the server automatically.

---

### Project Structure

```
ReadingBooks_KimQ/
├── backend/
│   ├── src/routes/
│   │   ├── library.js     # books CRUD from Supabase
│   │   ├── chapters.js    # chapters CRUD from Supabase
│   │   ├── admin.js       # add books/chapters + AI summarize
│   │   ├── chat.js        # AI chat with Groq
│   │   └── tts.js         # voice generation with Edge TTS
│   ├── server.js          # Express entry point
│   ├── seed.js            # bulk-add a book with chapters
│   ├── schema.sql         # Supabase table definitions
│   ├── build.sh           # Render build script
│   └── .env.example
└── frontend/
    └── src/
        └── App.jsx        # full React SPA (single file)
```

---

### Author

**The Minh — [@ptminh18](https://github.com/ptminh18)**

Built as a product builder challenge — demonstrating the ability to take an idea from zero to a working product using AI-assisted development in a few days.

---

---

## Tiếng Việt

### KimQReading là gì?

KimQReading là ứng dụng web full-stack giúp người dùng đọc sách trực tuyến với sự hỗ trợ của AI. Được xây dựng như một bài kiểm tra tư duy "Product Builder", dự án thể hiện khả năng tích hợp nhiều dịch vụ AI vào một sản phẩm hoàn chỉnh trong vài ngày.

### Vấn đề được giải quyết

> Nhiều người mua sách nhưng không bao giờ đọc hết. Họ thiếu bối cảnh, tóm tắt và người giải thích những phần khó.

KimQReading giải quyết bằng:

- AI tự động tóm tắt từng chương và toàn bộ cuốn sách
- Tính năng đọc to giúp nghe sách khi làm việc khác (hiện đã hoạt động tốt với cả Tiếng Việt lẫn Tiếng Anh)
- Chatbot AI trả lời mọi câu hỏi về sách, tác giả và ý tưởng

### Tính năng chính

| Tính năng                  | Mô tả                                                       |
| -------------------------- | ----------------------------------------------------------- |
| 📚 **Thư viện sách**       | Duyệt sách với ảnh bìa, tác giả, thể loại                   |
| 📖 **Đọc theo chương**     | Giao diện đọc sạch với nội dung đầy đủ                      |
| 🤖 **Tóm tắt chương (AI)** | Mỗi chương được Groq tóm tắt tự động                        |
| 📝 **Tóm tắt sách (AI)**   | Tổng hợp từ tất cả tóm tắt chương                           |
| 🔊 **Đọc to (TTS)**        | Nghe bất kỳ chương hoặc tóm tắt nào bằng giọng Việt/Anh     |
| 💬 **Chat AI**             | Hỏi về sách, tác giả, ý tưởng — có ngữ cảnh chương đang đọc |

### Cài đặt nhanh

```bash
# Clone
git clone https://github.com/ptminh18/ReadingBooks_KimQ.git

# Backend
cd backend && npm install
pipx install edge-tts
cp .env.example .env   # điền API keys
npm run dev

# Frontend (terminal mới)
cd frontend && npm install
cp .env.example .env   # điền VITE_API_BASE_URL
npm run dev
```

### Thêm sách

Sách được thêm thủ công qua seed script hoặc API admin — không cần upload file, chỉ cần paste nội dung chương vào. AI tự động tóm tắt từng chương và tạo tóm tắt toàn sách.

### Tác giả

**Phạm Thế Minh — [@ptminh18](https://github.com/ptminh18)**  
Xây dựng như bài kiểm tra tư duy Product Builder — đưa ý tưởng từ con số không đến sản phẩm hoàn chỉnh với sự hỗ trợ của AI trong vài ngày.

---

<div align="center">
  <sub>Built by The Minh · <a href="https://github.com/ptminh18">@ptminh18</a></sub>
</div>
