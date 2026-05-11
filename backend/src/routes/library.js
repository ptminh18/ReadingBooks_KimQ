import process from "process";

import { Router } from "express";
import { createClient } from "@supabase/supabase-js";

const router = Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
);

// GET /api/library — all books for home page grid
router.get("/", async (req, res) => {
  const { data, error } = await supabase
    .from("books")
    .select(
      "id, title, author, cover_url, category, language, published_year, page_count, description",
    )
    .order("created_at", { ascending: false })
    .limit(40);

  if (error) return res.status(500).json({ error: error.message });
  return res.json(data);
});

// GET /api/library/:bookId — single book full details
router.get("/:bookId", async (req, res) => {
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .eq("id", req.params.bookId)
    .single();

  if (error) return res.status(404).json({ error: "Book not found." });
  return res.json(data);
});

export default router;
