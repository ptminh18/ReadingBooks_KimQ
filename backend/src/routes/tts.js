/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
import { Router } from "express";
import { exec } from "child_process";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const router = Router();
const __dirname = dirname(fileURLToPath(import.meta.url));

// Cache dir — stores generated mp3 files so same text isn't re-generated
const CACHE_DIR = join(__dirname, "../../tts_cache");
if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
  );
}

// ─── Voices ──────────────────────────────────────────────────────────────────
const VOICES = {
  vi_female: "vi-VN-HoaiMyNeural", // Vietnamese female (default)
  vi_male: "vi-VN-NamMinhNeural", // Vietnamese male
  en_female: "en-US-JennyNeural", // English female
  en_male: "en-US-GuyNeural", // English male
};

function pickVoice(language = "vi", gender = "female") {
  const lang = language.startsWith("vi") ? "vi" : "en";
  return VOICES[`${lang}_${gender}`] || VOICES.vi_female;
}

// ─── Generate TTS with edge-tts (Python) ─────────────────────────────────────
function generateTTS(text, voice, outputPath) {
  return new Promise((resolve, reject) => {
    // Escape single quotes in text for shell safety
    const safeText = text.replace(/'/g, "'\\''").slice(0, 5000); // max 5000 chars
    const EDGE_TTS_PATH = process.env.EDGE_TTS_PATH || "edge-tts";
    const cmd = `${EDGE_TTS_PATH} --voice "${voice}" --text '${safeText}' --write-media "${outputPath}"`;

    exec(cmd, { timeout: 60000 }, (err, stdout, stderr) => {
      if (err) {
        console.error("[tts] edge-tts error:", stderr);
        reject(new Error(stderr || err.message));
      } else {
        resolve(outputPath);
      }
    });
  });
}

// ─── POST /api/tts ────────────────────────────────────────────────────────────
// Body: { text, language?, gender?, type?, bookId?, chapterId? }
//   text     — the text to speak (required)
//   language — "vi" | "en" (default: "vi")
//   gender   — "female" | "male" (default: "female")
//   type     — "book_summary" | "chapter_summary" | "chapter_content" | "custom"

router.post("/", async (req, res) => {
  const {
    text,
    language = "vi",
    gender = "female",
    type = "custom",
    bookId,
    chapterId,
  } = req.body;

  if (!text?.trim()) {
    return res.status(400).json({ error: "text is required." });
  }

  const voice = pickVoice(language, gender);

  // Cache key based on text + voice
  const hash = createHash("sha256")
    .update(`${voice}:${text.trim()}`)
    .digest("hex")
    .slice(0, 16);
  const cacheFile = join(CACHE_DIR, `${hash}.mp3`);

  try {
    // ── Use cached file if it exists ────────────────────────────────────────
    if (!existsSync(cacheFile)) {
      console.log(`[tts] Generating audio: ${type} (${voice})`);
      await generateTTS(text.trim(), voice, cacheFile);
      console.log(`[tts] Saved to cache: ${hash}.mp3`);
    } else {
      console.log(`[tts] Cache hit: ${hash}.mp3`);
    }

    // ── Stream the mp3 back ─────────────────────────────────────────────────
    const stat = fs.statSync(cacheFile);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", stat.size);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Accept-Ranges", "bytes");

    const stream = fs.createReadStream(cacheFile);
    stream.pipe(res);
  } catch (err) {
    console.error("[tts] Error:", err.message);
    return res.status(500).json({
      error:
        "TTS generation failed. Make sure edge-tts is installed: pip3 install edge-tts",
    });
  }
});

// ─── GET /api/tts/voices ──────────────────────────────────────────────────────
router.get("/voices", (_req, res) => {
  res.json(VOICES);
});

export default router;
