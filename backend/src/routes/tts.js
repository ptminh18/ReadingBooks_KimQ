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

    exec(cmd, { timeout: 60000 }, (err, stdout, stderr) => {
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
    });
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

  const voice = pickVoice(language, gender);
  const hash = createHash("sha256")
    .update(`${voice}:${text.trim()}`)
    .digest("hex")
    .slice(0, 16);
  const cacheFile = join(CACHE_DIR, `${hash}.mp3`);

  try {
    if (!existsSync(cacheFile)) {
      console.log(`[tts] Generating: ${type} (${voice})`);
      await generateTTS(text.trim().slice(0, 5000), voice, cacheFile);
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
    console.error("[tts] Error:", err.message);
    return res
      .status(500)
      .json({ error: "TTS generation failed: " + err.message });
  }
});

router.get("/voices", (_req, res) => res.json(VOICES));

export default router;
