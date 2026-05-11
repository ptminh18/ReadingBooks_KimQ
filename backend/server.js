/* eslint-disable no-undef */
import "dotenv/config";
import express from "express";
import cors from "cors";
import booksRouter from "./src/routes/books.js";
import chaptersRouter from "./src/routes/chapters.js";
import libraryRouter from "./src/routes/library.js";
import adminRouter from "./src/routes/admin.js";
import chatRouter from "./src/routes/chat.js";
import ttsRouter from "./src/routes/tts.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "2mb" }));

app.use("/api/books", booksRouter);
app.use("/api/library", libraryRouter);
app.use("/api/chapters", chaptersRouter);
app.use("/api/admin", adminRouter);
app.use("/api/chat", chatRouter);
app.use("/api/tts", ttsRouter);

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.listen(PORT, () => {
  console.log(`KimQReading API running on http://localhost:${PORT}`);
});
