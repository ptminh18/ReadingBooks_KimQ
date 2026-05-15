import { API_BASE, TTS_MAX_CHARS } from "./constants";

const get = (url) => fetch(url).then((r) => r.json());
const post = (url, body) =>
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

export const api = {
  library: () => get(`${API_BASE}/api/library`),
  book: (id) => get(`${API_BASE}/api/library/${id}`),
  chapters: (bookId) => get(`${API_BASE}/api/chapters/${bookId}`),
  chapter: (bookId, n) => get(`${API_BASE}/api/chapters/${bookId}/${n}`),
  chat: (body) => post(`${API_BASE}/api/chat`, body).then((r) => r.json()),
  tts: (text, language, gender) =>
    post(`${API_BASE}/api/tts`, {
      text: text.slice(0, TTS_MAX_CHARS),
      language,
      gender,
    }),
};
