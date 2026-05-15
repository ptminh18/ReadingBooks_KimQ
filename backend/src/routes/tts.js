/* eslint-disable no-empty */
/* eslint-disable no-undef */
import { Router } from "express";
import { exec, spawn } from "child_process";
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

function getAlternateVoice(currentVoice) {
  // try to pick the opposite-gender voice for the same language
  try {
    if (!currentVoice) return VOICES.vi_female;
    if (
      currentVoice.includes("HoaiMy") ||
      currentVoice.includes("HoaiMyNeural")
    )
      return VOICES.vi_male;
    if (
      currentVoice.includes("NamMinh") ||
      currentVoice.includes("NamMinhNeural")
    )
      return VOICES.vi_female;
    if (currentVoice.includes("Jenny") || currentVoice.includes("JennyNeural"))
      return VOICES.en_male;
    if (currentVoice.includes("Guy") || currentVoice.includes("GuyNeural"))
      return VOICES.en_female;
    // fallback: if voice starts with vi return vi_male else en_male
    if (currentVoice.startsWith("vi")) return VOICES.vi_male;
    return VOICES.en_male;
  } catch (e) {
    return VOICES.vi_female;
  }
}

// Generate single chunk using spawn so we stream stderr and avoid exec buffer limits
function generateTTSChunk(text, voice, outputPath) {
  return new Promise((resolve, reject) => {
    const EDGE_TTS_PATH = process.env.EDGE_TTS_PATH || "edge-tts";

    // Write text to a temp file to avoid shell escaping issues with Vietnamese/Unicode
    const tmpFile = join(
      os.tmpdir(),
      `tts_${Date.now()}_${Math.random().toString(36).slice(2)}.txt`,
    );
    writeFileSync(tmpFile, text, "utf8");

    const args = [
      "--voice",
      voice,
      "--file",
      tmpFile,
      "--write-media",
      outputPath,
    ];
    console.log("[tts] Spawning:", EDGE_TTS_PATH, args.join(" "));

    let stderr = "";
    const child = spawn(EDGE_TTS_PATH, args);
    child.stderr.on("data", (d) => {
      const s = String(d);
      stderr += s;
      process.stderr.write(s);
    });
    child.on("error", (err) => {
      try {
        fs.unlinkSync(tmpFile);
      } catch {}
      reject(err);
    });
    child.on("close", (code) => {
      try {
        fs.unlinkSync(tmpFile);
      } catch {}
      if (code === 0) resolve(outputPath);
      else reject(new Error(stderr || `edge-tts exited with code ${code}`));
    });
  });
}

function ffmpegConcat(fileListPath, outPath) {
  return new Promise((resolve, reject) => {
    const ff = process.env.FFMPEG_PATH || "ffmpeg";
    const args = [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      fileListPath,
      "-c",
      "copy",
      outPath,
    ];
    console.log("[tts] ffmpeg concat:", ff, args.join(" "));
    let stderr = "";
    const p = spawn(ff, args);
    p.stderr.on("data", (d) => {
      const s = String(d);
      stderr += s;
      process.stderr.write(s);
    });
    p.on("error", (err) => reject(err));
    p.on("close", (code) => {
      if (code === 0) resolve(outPath);
      else reject(new Error(stderr || `ffmpeg exit ${code}`));
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

      // split into chunks for robust generation (helps long/slow Vietnamese chapters)
      const CHUNK_SIZE = 5000;
      const chunks = [];
      for (let i = 0; i < payload.length; i += CHUNK_SIZE)
        chunks.push(payload.slice(i, i + CHUNK_SIZE));

      if (chunks.length === 1) {
        try {
          await generateTTSChunk(payload, voice, cacheFile);
        } catch (err) {
          console.warn(
            "[tts] single-chunk generation failed, trying alternate voice",
            err && err.message,
          );
          const alt = getAlternateVoice(voice);
          try {
            await generateTTSChunk(payload, alt, cacheFile);
            console.log(
              "[tts] single-chunk recovered with alternate voice",
              alt,
            );
          } catch (err2) {
            throw err; // rethrow original
          }
        }
      } else {
        // create temp dir for parts
        const tmpDir = join(
          os.tmpdir(),
          `tts_parts_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        );
        mkdirSync(tmpDir, { recursive: true });
        const partFiles = [];
        try {
          for (let i = 0; i < chunks.length; i++) {
            const partPath = join(tmpDir, `part_${i}.mp3`);
            console.log(
              `[tts] Generating chunk ${i + 1}/${chunks.length} to ${partPath}`,
            );
            try {
              await generateTTSChunk(chunks[i], voice, partPath);
            } catch (err) {
              // if edge-tts returned NoAudioReceived, try alternate voice once
              const msg = err && err.message ? String(err.message) : "";
              console.warn(`[tts] chunk ${i} failed: ${msg}`);
              if (
                msg.includes("No audio was received") ||
                msg.includes("NoAudioReceived")
              ) {
                const alt = getAlternateVoice(voice);
                console.log(
                  `[tts] retrying chunk ${i} with alternate voice ${alt}`,
                );
                try {
                  // small backoff
                  await new Promise((r) => setTimeout(r, 400));
                  await generateTTSChunk(chunks[i], alt, partPath);
                } catch (err2) {
                  console.error(
                    `[tts] retry failed for chunk ${i}:`,
                    err2 && err2.message,
                  );
                  throw err; // rethrow original to surface to caller
                }
              } else {
                throw err;
              }
            }
            partFiles.push(partPath);
          }

          // create concat list file
          const listPath = join(tmpDir, `list.txt`);
          const listContent = partFiles
            .map((p) => `file '${p.replace(/'/g, "'\\''")}'`)
            .join("\n");
          writeFileSync(listPath, listContent, "utf8");

          // run ffmpeg concat
          await ffmpegConcat(listPath, cacheFile);
          console.log(`[tts] Cached (concatenated): ${hash}.mp3`);
        } finally {
          // cleanup parts
          try {
            for (const p of partFiles) {
              try {
                fs.unlinkSync(p);
              } catch {}
            }
            try {
              fs.unlinkSync(join(tmpDir, `list.txt`));
            } catch {}
            try {
              fs.rmdirSync(tmpDir);
            } catch {}
          } catch {}
        }
      }
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
