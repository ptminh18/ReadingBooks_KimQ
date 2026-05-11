/* eslint-disable no-undef */
import { Router } from "express";
import { createClient } from "@supabase/supabase-js";
import Groq from "groq-sdk";

const router = Router();

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
  );
}

function getGroq() {
  return new Groq({ apiKey: process.env.GROQ_API_KEY });
}

// ─── POST /api/chat ───────────────────────────────────────────────────────────
// Body: {
//   message      — user's message (required)
//   bookId       — current book UUID (optional but gives better context)
//   chapterId    — current chapter UUID (optional)
//   history      — array of { role: 'user'|'assistant', content: string }
// }

router.post("/", async (req, res) => {
  const { message, bookId, chapterId, history = [] } = req.body;

  if (!message?.trim()) {
    return res.status(400).json({ error: "message is required." });
  }

  const supabase = getSupabase();
  const groq = getGroq();

  try {
    // ── 1. Build context from book + chapter ──────────────────────────────────
    let bookContext = "";

    if (bookId) {
      const { data: book } = await supabase
        .from("books")
        .select("title, author, description, book_summary")
        .eq("id", bookId)
        .single();

      if (book) {
        bookContext += `Book: "${book.title}" by ${book.author}.\n`;
        if (book.description)
          bookContext += `Description: ${book.description}\n`;
        if (book.book_summary)
          bookContext += `Book summary: ${book.book_summary}\n`;
      }
    }

    if (chapterId) {
      const { data: chapter } = await supabase
        .from("chapters")
        .select("chapter_number, title, content, summary")
        .eq("id", chapterId)
        .single();

      if (chapter) {
        bookContext += `\nCurrently reading: Chapter ${chapter.chapter_number} — "${chapter.title}"\n`;
        if (chapter.summary)
          bookContext += `Chapter summary: ${chapter.summary}\n`;
        // Include first 3000 chars of chapter content for context
        if (chapter.content) {
          bookContext += `\nChapter excerpt:\n${chapter.content.slice(0, 3000)}${chapter.content.length > 3000 ? "..." : ""}\n`;
        }
      }
    }

    // ── 2. Build system prompt ─────────────────────────────────────────────────
    const systemPrompt = `You are an intelligent reading assistant for KimQReading, a book reading app.
Your role is to help users understand books deeply, answer questions about content, themes, authors, and provide insights.

${bookContext ? `CURRENT CONTEXT:\n${bookContext}` : "The user is browsing the library and hasn't selected a specific book yet."}

GUIDELINES:
- Answer questions about the book's content, themes, characters, and ideas
- If asked about the author, share relevant background about their life and other works
- Provide thoughtful analysis and insights, not just surface-level answers
- If you don't know something specific, say so honestly
- Keep responses concise but insightful (2-4 paragraphs max)
- Always respond in the same language the user is writing in
- Be encouraging and make the reading experience enjoyable`;

    // ── 3. Build message history for Groq ─────────────────────────────────────
    // Keep last 10 messages to avoid token overflow
    const recentHistory = history.slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const messages = [
      { role: "system", content: systemPrompt },
      ...recentHistory,
      { role: "user", content: message.trim() },
    ];

    // ── 4. Call Groq ───────────────────────────────────────────────────────────
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    });

    const reply = completion.choices[0]?.message?.content?.trim();
    if (!reply) throw new Error("Empty response from AI");

    // ── 5. Save to Supabase (optional, for history) ────────────────────────────
    if (bookId) {
      await supabase.from("chat_messages").insert([
        {
          book_id: bookId,
          chapter_id: chapterId || null,
          role: "user",
          content: message.trim(),
        },
        {
          book_id: bookId,
          chapter_id: chapterId || null,
          role: "assistant",
          content: reply,
        },
      ]);
    }

    return res.json({ reply });
  } catch (err) {
    console.error("[chat] Error:", err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/chat/history/:bookId ────────────────────────────────────────────
// Get past chat messages for a book

router.get("/history/:bookId", async (req, res) => {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, role, content, chapter_id, created_at")
    .eq("book_id", req.params.bookId)
    .order("created_at", { ascending: true })
    .limit(100);

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

export default router;
