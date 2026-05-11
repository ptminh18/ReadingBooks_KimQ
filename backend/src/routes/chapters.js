import process from "process";

import { Router } from "express";
import { createClient } from "@supabase/supabase-js";

const router = Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

// GET /api/chapters/:bookId — all chapters for a book (no content, for sidebar)
router.get("/:bookId", async (req, res) => {
  const { data, error } = await supabase
    .from("chapters")
    .select("id, chapter_number, title, summary")
    .eq("book_id", req.params.bookId)
    .order("chapter_number", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// GET /api/chapters/:bookId/:chapterNumber — single chapter with full content
router.get("/:bookId/:chapterNumber", async (req, res) => {
  const { data, error } = await supabase
    .from("chapters")
    .select("id, chapter_number, title, content, summary")
    .eq("book_id", req.params.bookId)
    .eq("chapter_number", req.params.chapterNumber)
    .single();

  if (error) return res.status(404).json({ error: "Chapter not found." });
  return res.json(data);
});

export default router;
