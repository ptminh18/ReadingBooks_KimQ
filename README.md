<<<<<<< HEAD
# KimQReading
Books Readings Web Application
=======
<div align="center">

# 📚 KimQReading

**An AI-powered book reading web application**  
*Ứng dụng đọc sách thông minh tích hợp AI*

[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite)](https://vitejs.dev)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-3-38BDF8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![Express](https://img.shields.io/badge/Express-4-000000?style=flat-square&logo=express)](https://expressjs.com)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com)
[![Groq](https://img.shields.io/badge/Groq-Llama3.3-F55036?style=flat-square)](https://groq.com)

[🚀 Live Demo](#) · [📖 Features](#-features--tính-năng) · [🛠 Setup](#-setup--cài-đặt) · [🏗 Architecture](#-architecture--kiến-trúc)

</div>

---

## 🇬🇧 English

### What is KimQReading?

KimQReading is a full-stack web application that reimagines how people read books online. Built as a product builder challenge, it demonstrates how AI can enhance every step of the reading experience — from discovering a book to understanding its deepest ideas.

The app was designed and built from scratch in a few days, integrating multiple AI services, a real database, and a clean UI to create something that feels like a real product.

### 💡 The Problem It Solves

> People buy books but rarely finish them. They lack context, summaries, and someone to explain the hard parts.

KimQReading solves this with:
- AI-generated chapter & book summaries so readers know what they're getting into
- A voice reading feature so you can listen while doing other things
- An AI chatbot that answers questions about the book like a knowledgeable friend

---

### ✨ Features / Tính năng

| Feature | Description |
|---|---|
| 📚 **Book Library** | Browse all books with cover images, author, and category |
| 📖 **Chapter Reading** | Clean reading experience with full chapter content |
| 🤖 **AI Chapter Summary** | Each chapter auto-summarized by Groq (Llama 3.3) |
| 📝 **AI Book Summary** | Full book summary generated from all chapter summaries |
| 🔊 **Voice Reading (TTS)** | Listen to any summary or chapter via Edge TTS (Vietnamese & English) |
| 💬 **AI Chat Assistant** | Ask anything about the book, author, or ideas — powered by Groq |
| 🔍 **Google Books Search** | Search and pull real book metadata from Google Books API |

---

### 🏗 Architecture / Kiến trúc

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
                          │ HTTP / REST API
┌─────────────────────────▼───────────────────────────────────┐
│                        BACKEND                              │
│                    Express.js API                           │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │ /library │  │ /chapters│  │  /chat   │  │   /tts    │  │
│  │ /books   │  │ /admin   │  │          │  │           │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬─────┘  │
└───────┼─────────────┼─────────────┼───────────────┼─────────┘
        │             │             │               │
   ┌────▼────┐   ┌────▼────┐  ┌────▼────┐   ┌─────▼──────┐
   │Supabase │   │Supabase │  │  Groq   │   │  Edge TTS  │
   │(books)  │   │(chapters│  │Llama3.3 │   │  (Python)  │
   └─────────┘   └─────────┘  └─────────┘   └────────────┘
        │
   ┌────▼──────────┐
   │ Google Books  │
   │     API       │
   └───────────────┘
```

### 🔄 How Each Feature Works

**1. Book Library**
- Frontend calls `GET /api/library`
- Backend queries Supabase `books` table
- Returns cover, title, author, category

**2. AI Chapter Summary**
- When a chapter is added via `POST /api/admin/books/:id/chapters`
- Backend sends chapter content to Groq (Llama 3.3 70B)
- Summary saved to Supabase `chapters.summary` column
- Displayed when user clicks "Tóm tắt chương"

**3. AI Book Summary**
- `POST /api/admin/books/:id/summarize`
- Backend fetches all chapter summaries from Supabase
- Sends them all to Groq with a synthesis prompt
- Result saved to `books.book_summary`

**4. Voice Reading (TTS)**
- User clicks "Nghe" on any summary or chapter
- Frontend POSTs text to `POST /api/tts`
- Backend runs `edge-tts` (Python CLI) to generate `.mp3`
- MP3 is cached by SHA256 hash to avoid re-generation
- Audio streamed back to frontend and played via HTML Audio API

**5. AI Chat**
- User types a question in the chat panel
- Frontend sends `{ message, bookId, chapterId, history[] }`
- Backend builds a system prompt with book context + chapter excerpt
- Groq returns a contextual answer
- Conversation history maintained in frontend state
- All messages saved to Supabase `chat_messages` table

---

### 🛠 Setup / Cài đặt

#### Prerequisites
- Node.js 18+
- Python 3.10+
- A Supabase account (free)
- A Groq API key (free at [console.groq.com](https://console.groq.com))

#### 1. Clone the repo
```bash
git clone https://github.com/ptminh18/kimqreading.git
cd kimqreading
```

#### 2. Backend setup
```bash
cd backend
npm install
pip3 install edge-tts   # or: pipx install edge-tts
cp .env.example .env
```

Fill in `.env`:
```env
PORT=3001
CLIENT_ORIGIN=http://localhost:5173
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
GROQ_API_KEY=gsk_your_groq_key
EDGE_TTS_PATH=/usr/local/bin/edge-tts   # run: which edge-tts
```

```bash
npm run dev
```

#### 3. Frontend setup
```bash
cd frontend
npm install
cp .env.example .env
```

Fill in `.env`:
```env
VITE_API_BASE_URL=http://localhost:3001
```

```bash
npm run dev
```

#### 4. Database setup
Run the SQL in `backend/schema.sql` in your Supabase SQL Editor.

#### 5. Add your first book
```bash
cd backend
node seed.js   # edit BOOK and CHAPTERS variables first
```

Open [http://localhost:5173](http://localhost:5173) 🎉

---

### 🚀 Deployment

#### Frontend → Vercel (free, recommended)
1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com) → Import project → select `frontend` folder
3. Add environment variable: `VITE_API_BASE_URL=https://your-backend.railway.app`
4. Deploy → get a live URL instantly

#### Backend → Railway (free tier)
1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select the `backend` folder
3. Add all environment variables from `.env`
4. For Edge TTS: add a `nixpacks.toml` in backend root:
```toml
[phases.setup]
nixPkgs = ["python311", "python311Packages.pip"]

[phases.install]
cmds = ["pip install edge-tts", "npm install"]
```
5. Deploy → copy the URL → paste into Vercel's `VITE_API_BASE_URL`

---

### 🗂 Project Structure

```
kimqreading/
├── backend/
│   ├── src/
│   │   └── routes/
│   │       ├── book.js        # Google Books API proxy
│   │       ├── library.js     # Supabase books CRUD
│   │       ├── chapters.js    # Supabase chapters CRUD
│   │       ├── admin.js       # Add books/chapters + AI summarize
│   │       ├── chat.js        # AI chat with Groq
│   │       └── tts.js         # Edge TTS voice generation
│   ├── server.js
│   ├── seed.js                # Script to bulk-add a book
│   ├── schema.sql             # Supabase table definitions
│   └── .env.example
└── frontend/
    └── src/
        └── App.jsx            # Single-page React app
```

---

### 👤 Author

**The Minh (ptminh18)**  
Built as a product builder challenge — demonstrating the ability to take an idea from zero to a working product using AI-assisted development.

- GitHub: [@ptminh18](https://github.com/ptminh18)

---

---

## 🇻🇳 Tiếng Việt

### KimQReading là gì?

KimQReading là ứng dụng web full-stack giúp người dùng đọc sách trực tuyến với sự hỗ trợ của AI. Được xây dựng như một bài kiểm tra tư duy "Product Builder", dự án này thể hiện khả năng tích hợp nhiều dịch vụ AI vào một sản phẩm hoàn chỉnh trong vài ngày.

### 💡 Vấn đề được giải quyết

> Nhiều người mua sách nhưng không bao giờ đọc hết. Họ thiếu bối cảnh, tóm tắt và người giải thích những phần khó.

KimQReading giải quyết điều này bằng:
- AI tự động tóm tắt từng chương và toàn bộ cuốn sách
- Tính năng đọc to giúp nghe sách khi làm việc khác
- Chatbot AI trả lời mọi câu hỏi về sách như một người bạn hiểu biết

### ✨ Tính năng chính

| Tính năng | Mô tả |
|---|---|
| 📚 **Thư viện sách** | Duyệt sách với ảnh bìa, tác giả, thể loại |
| 📖 **Đọc theo chương** | Giao diện đọc sạch sẽ với nội dung đầy đủ |
| 🤖 **Tóm tắt chương (AI)** | Mỗi chương được Groq tóm tắt tự động |
| 📝 **Tóm tắt sách (AI)** | Tổng hợp từ tất cả tóm tắt chương |
| 🔊 **Đọc to (TTS)** | Nghe bất kỳ tóm tắt hoặc chương nào bằng giọng Việt/Anh |
| 💬 **Chat AI** | Hỏi về sách, tác giả, ý tưởng — powered by Groq |
| 🔍 **Tìm kiếm Google Books** | Lấy thông tin sách thực từ Google Books API |

### 🛠 Cài đặt nhanh

```bash
# 1. Clone repo
git clone https://github.com/ptminh18/kimqreading.git

# 2. Backend
cd backend && npm install
pip3 install edge-tts
cp .env.example .env  # điền các API keys

# 3. Frontend  
cd frontend && npm install
cp .env.example .env  # điền VITE_API_BASE_URL

# 4. Chạy
cd backend && npm run dev   # terminal 1
cd frontend && npm run dev  # terminal 2
```

### 👤 Tác giả

**Phạm Thế Minh (ptminh18)**  
Được xây dựng như một bài kiểm tra tư duy Product Builder — thể hiện khả năng đưa ý tưởng từ con số không đến sản phẩm hoàn chỉnh với sự hỗ trợ của AI.

---

<div align="center">
  <sub>Built with ❤️ by The Minh · <a href="https://github.com/ptminh18">@ptminh18</a></sub>
</div>
>>>>>>> 3efc0ce (KimQReading is about 90% completed, adding more books is on process)
