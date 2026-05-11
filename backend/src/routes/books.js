import process from "process";

import { Router } from "express";
import fetch from "node-fetch";

const router = Router();
const GOOGLE_BOOKS_BASE = "https://www.googleapis.com/books/v1";

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Normalise a raw Google Books volume into a clean shape
 * the frontend can consume directly.
 */
function normaliseVolume(item) {
  const info = item.volumeInfo || {};
  const saleInfo = item.saleInfo || {};
  const accessInfo = item.accessInfo || {};

  return {
    googleId: item.id,
    title: info.title || "Unknown Title",
    subtitle: info.subtitle || null,
    authors: info.authors || [],
    publisher: info.publisher || null,
    publishedDate: info.publishedDate || null,
    description: info.description || null,
    pageCount: info.pageCount || null,
    categories: info.categories || [],
    language: info.language || null,
    averageRating: info.averageRating || null,
    ratingsCount: info.ratingsCount || null,
    maturityRating: info.maturityRating || null,
    thumbnail:
      info.imageLinks?.extraLarge ||
      info.imageLinks?.large ||
      info.imageLinks?.medium ||
      info.imageLinks?.thumbnail ||
      info.imageLinks?.smallThumbnail ||
      null,
    previewLink: info.previewLink || null,
    infoLink: info.infoLink || null,
    // Sale / access info
    saleability: saleInfo.saleability || null,
    isEbook: saleInfo.isEbook || false,
    buyLink: saleInfo.buyLink || null,
    viewability: accessInfo.viewability || null,
    embeddable: accessInfo.embeddable || false,
    // Raw ISBNs
    industryIdentifiers: info.industryIdentifiers || [],
  };
}

function buildApiUrl(path, params = {}) {
  const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
  const url = new URL(`${GOOGLE_BOOKS_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") {
      url.searchParams.set(k, v);
    }
  });
  if (apiKey) url.searchParams.set("key", apiKey);
  return url.toString();
}

// ─── Routes ─────────────────────────────────────────────────────────────────

/**
 * GET /api/books/search
 * Query params:
 *   q          – search term (required)
 *   maxResults – 1-40 (default 12)
 *   startIndex – pagination offset (default 0)
 *   langRestrict – e.g. "vi", "en"
 *   orderBy    – "relevance" | "newest"
 *   filter     – "partial" | "full" | "free-ebooks" | "paid-ebooks" | "ebooks"
 */
router.get("/search", async (req, res) => {
  const {
    q,
    maxResults = 12,
    startIndex = 0,
    langRestrict,
    orderBy = "relevance",
    filter,
  } = req.query;

  if (!q || !q.trim()) {
    return res.status(400).json({ error: "Query parameter `q` is required." });
  }

  try {
    const url = buildApiUrl("/volumes", {
      q: q.trim(),
      maxResults: Math.min(Number(maxResults), 40),
      startIndex,
      langRestrict,
      orderBy,
      filter,
      printType: "books",
    });

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "Google Books API error",
      });
    }

    return res.json({
      totalItems: data.totalItems || 0,
      items: (data.items || []).map(normaliseVolume),
    });
  } catch (err) {
    console.error("[/search]", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

/**
 * GET /api/books/:googleId
 * Returns full details for a single volume.
 */
router.get("/:googleId", async (req, res) => {
  const { googleId } = req.params;

  try {
    const url = buildApiUrl(`/volumes/${googleId}`);
    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || "Google Books API error",
      });
    }

    return res.json(normaliseVolume(data));
  } catch (err) {
    console.error("[/:googleId]", err);
    return res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
