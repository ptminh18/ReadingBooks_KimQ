/* eslint-disable no-empty */
/* eslint-disable no-undef */
import { Router } from "express";
import { exec } from "child_process";
import { createHash } from "crypto";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import os from "os";

const router = Router();
const __dirname = dirname(fileURLToPath(import.meta.url));

const CACHE_DIR = join(__dirname, "../../tts_cache");
if (!existsSync(CACHE_DIR)) mkdirSync(CACHE_DIR, { recursive: true });

const VOICES = {
  vi_female: "vi-VN-HoaiMyNeural",
  vi_male: "vi-VN-NamMinhNeural",
  en_female: "en-US-JennyNeural",
  en_male: "en-US-GuyNeural",
};

function pickVoice(language = "vi", gender = "female") {
  const lang = language.startsWith("vi") ? "vi" : "en";
  return VOICES[`${lang}_${gender}`] || VOICES.vi_female;
}

function generateTTS(text, voice, outputPath) {
  return new Promise((resolve, reject) => {
    const EDGE_TTS_PATH = process.env.EDGE_TTS_PATH || "edge-tts";

    // Write text to a temp file to avoid shell escaping issues with Vietnamese/Unicode
    const tmpFile = join(os.tmpdir(), `tts_${Date.now()}.txt`);
    writeFileSync(tmpFile, text, "utf8");

    // Use --file flag instead of --text to avoid shell encoding issues
    const cmd = `"${EDGE_TTS_PATH}" --voice "${voice}" --file "${tmpFile}" --write-media "${outputPath}"`;

    console.log("[tts] Running:", cmd);

    // increase timeout and buffer to handle longer inputs and larger stderr output
    exec(
      cmd,
      { timeout: 180000, maxBuffer: 10 * 1024 * 1024 },
      (err, stdout, stderr) => {
        // Clean up temp file
        try {
          fs.unlinkSync(tmpFile);
        } catch {}

        if (err) {
          console.error("[tts] stderr:", stderr);
          console.error("[tts] err:", err.message);
          reject(new Error(stderr || err.message));
        } else {
          resolve(outputPath);
        }
      },
    );
  });
}

router.post("/", async (req, res) => {
  const {
    text,
    language = "vi",
    gender = "female",
    type = "custom",
  } = req.body;

  if (!text?.trim()) {
    return res.status(400).json({ error: "text is required." });
  }

  // sanitize and prepare text
  const voice = pickVoice(language, gender);
  const sanitizeText = (t) => {
    if (!t) return "";
    // remove HTML tags
    let s = String(t).replace(/<[^>]*>/g, " ");
    // remove control chars except newlines and basic whitespace
    s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, " ");
    // collapse repeated whitespace
    s = s.replace(/\s{2,}/g, " ");
    return s.trim();
  };

  const cleanText = sanitizeText(text || "");
  const hash = createHash("sha256")
    .update(`${voice}:${cleanText}`)
    .digest("hex")
    .slice(0, 16);
  const cacheFile = join(CACHE_DIR, `${hash}.mp3`);

  try {
    if (!existsSync(cacheFile)) {
      console.log(
        `[tts] Generating: ${type} (${voice}) original_len=${String(text || "").length} cleaned_len=${cleanText.length}`,
      );
      // trim and cap text to 15000 chars (frontend cap)
      const payload = cleanText.slice(0, 15000);
      await generateTTS(payload, voice, cacheFile);
      console.log(`[tts] Cached: ${hash}.mp3`);
    } else {
      console.log(`[tts] Cache hit: ${hash}.mp3`);
    }

    const stat = fs.statSync(cacheFile);
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", stat.size);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("Accept-Ranges", "bytes");
    fs.createReadStream(cacheFile).pipe(res);
  } catch (err) {
    console.error("[tts] Error:", err.message || err);
    // if child process produced stderr, include truncated stderr when available
    const message = err.message || String(err);
    const truncated =
      message.length > 2000 ? message.slice(0, 2000) + "..." : message;
    return res
      .status(500)
      .json({ error: "TTS generation failed: " + truncated });
  }
});

router.get("/voices", (_req, res) => res.json(VOICES));

export default router;
