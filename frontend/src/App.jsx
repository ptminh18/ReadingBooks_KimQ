/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useRef, useCallback } from "react";
import {
  BookOpen,
  FileText,
  ChevronLeft,
  ChevronRight,
  Send,
  X,
  Volume2,
  Info,
  Gauge,
  Globe,
  Loader2,
  ArrowLeft,
  Sparkles,
  Bot,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
} from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";
const TTS_MAX_CHARS = 5000;
const CHAT_HISTORY_LIMIT = 10;
const PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5];

// ─── API ──────────────────────────────────────────────────────────────────────
const api = {
  library: () => fetch(`${API_BASE}/api/library`).then((r) => r.json()),
  book: (id) => fetch(`${API_BASE}/api/library/${id}`).then((r) => r.json()),
  chapters: (bookId) =>
    fetch(`${API_BASE}/api/chapters/${bookId}`).then((r) => r.json()),
  chapter: (bookId, n) =>
    fetch(`${API_BASE}/api/chapters/${bookId}/${n}`).then((r) => r.json()),
  chat: (body) =>
    fetch(`${API_BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => r.json()),
  tts: (text, language, gender) =>
    fetch(`${API_BASE}/api/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language, gender }),
    }),
};

// ─── useTTS ───────────────────────────────────────────────────────────────────
function useTTS() {
  const audioRef = useRef(null);
  const stoppedRef = useRef(false); // prevents canplay from firing after stop
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [currentText, setCurrentText] = useState("");

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const onTimeUpdate = () => setProgress(audio.currentTime);
    const onDuration = () => setDuration(audio.duration);
    const onEnded = () => {
      setStatus("idle");
      setProgress(0);
    };
    const onError = () => setStatus("error");
    const onCanPlay = () => {
      if (stoppedRef.current) return; // guard against restart after stop
      audio.playbackRate = speed;
      audio.play().catch(() => setStatus("error"));
      setStatus("playing");
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDuration);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.addEventListener("canplay", onCanPlay);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDuration);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("canplay", onCanPlay);
      audio.pause();
      audio.src = "";
    };
  }, []); // eslint-disable-line

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  const speak = useCallback(
    async (text, language = "vi", gender = "female") => {
      if (!text?.trim()) return;
      const audio = audioRef.current;
      stoppedRef.current = false;
      audio.pause();
      audio.src = "";
      setStatus("loading");
      setCurrentText(text.slice(0, 60) + (text.length > 60 ? "..." : ""));
      setProgress(0);
      setDuration(0);

      try {
        const res = await api.tts(
          text.slice(0, TTS_MAX_CHARS),
          language,
          gender,
        );
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error);
        }
        const blob = await res.blob();
        if (stoppedRef.current) return; // user stopped while loading
        audio.src = URL.createObjectURL(blob);
        audio.load();
      } catch (err) {
        console.error("[TTS]", err);
        setStatus("error");
      }
    },
    [],
  );

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio.src) return;
    if (status === "playing") {
      audio.pause();
      setStatus("paused");
    } else {
      audio.play();
      setStatus("playing");
    }
  }, [status]);

  const seek = useCallback((delta) => {
    const audio = audioRef.current;
    audio.currentTime = Math.max(
      0,
      Math.min(audio.currentTime + delta, audio.duration || 0),
    );
  }, []);

  // Full stop — clears src + calls load() to abort any pending browser fetch
  const stop = useCallback(() => {
    stoppedRef.current = true;
    const audio = audioRef.current;
    audio.pause();
    audio.src = "";
    audio.load();
    setStatus("idle");
    setProgress(0);
    setDuration(0);
    setCurrentText("");
  }, []);

  const cycleSpeed = useCallback(() => {
    setSpeed((s) => {
      const idx = PLAYBACK_SPEEDS.indexOf(s);
      return PLAYBACK_SPEEDS[(idx + 1) % PLAYBACK_SPEEDS.length];
    });
  }, []);

  const formatTime = (s) =>
    isNaN(s)
      ? "0:00"
      : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  return {
    speak,
    togglePlay,
    seek,
    stop,
    cycleSpeed,
    status,
    progress,
    duration,
    speed,
    formatTime,
    currentText,
  };
}

// ─── AudioBar ─────────────────────────────────────────────────────────────────
function AudioBar({ tts, visible = true, onClose }) {
  const {
    status,
    progress,
    duration,
    speed,
    formatTime,
    togglePlay,
    seek,
    stop,
    cycleSpeed,
    currentText,
  } = tts;
  if (!visible) return null;

  const pct = duration ? `${(progress / duration) * 100}%` : "0%";

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-[80vw] bg-white border border-gray-200 rounded-t-2xl px-6 py-4 shadow-xl z-40">
      <button
        onClick={() => {
          console.log("AudioBar close clicked");
          if (onClose) onClose();
          else stop();
        }}
        className="absolute top-3 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1"
        title="Close audio player"
      >
        <X size={20} />
      </button>
      <div className="max-w-5xl mx-auto flex items-center gap-6">
        {/* Info */}
        <div className="hidden lg:flex items-center gap-3 w-64 shrink-0">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 shrink-0">
            <Volume2 size={20} />
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-xs font-bold truncate text-gray-900">
              {status === "loading" ? "Đang tạo audio..." : "Đang phát"}
            </p>
            <p className="text-[10px] text-gray-500 truncate">{currentText}</p>
          </div>
          <button
            onClick={onClose ? onClose : stop}
            className="text-gray-300 hover:text-red-500 transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Controls */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-center gap-5">
            <button
              onClick={() => seek(-10)}
              disabled={status === "loading"}
              className="text-gray-400 hover:text-indigo-600 transition-colors disabled:opacity-40"
            >
              <RotateCcw size={20} />
            </button>
            <button
              onClick={togglePlay}
              disabled={status === "loading"}
              className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:scale-105 transition-all shadow-md disabled:opacity-60"
            >
              {status === "loading" ? (
                <Loader2 size={22} className="animate-spin" />
              ) : status === "playing" ? (
                <Pause size={24} />
              ) : (
                <Play size={24} className="ml-1" />
              )}
            </button>
            <button
              onClick={() => seek(10)}
              disabled={status === "loading"}
              className="text-gray-400 hover:text-indigo-600 transition-colors disabled:opacity-40"
            >
              <RotateCw size={20} />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono font-bold text-gray-400 w-8">
              {formatTime(progress)}
            </span>
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full">
              <div
                className="h-full bg-indigo-600 rounded-full transition-all"
                style={{ width: pct }}
              />
            </div>
            <span className="text-[10px] font-mono font-bold text-gray-400 w-8">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Speed */}
        <div className="w-24 flex justify-end">
          <button
            onClick={cycleSpeed}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-gray-100"
          >
            <Gauge size={14} />
            <span className="text-xs font-bold font-mono">{speed}x</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── BookCover ────────────────────────────────────────────────────────────────
function BookCover({ book, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group flex flex-col gap-3 text-left hover:scale-[1.03] transition-all duration-200"
    >
      <div className="aspect-[2/3] w-full rounded-xl overflow-hidden bg-gradient-to-br from-indigo-100 to-purple-100 shadow-md group-hover:shadow-xl transition-shadow border border-gray-100">
        {book.cover_url ? (
          <img
            src={book.cover_url}
            alt={book.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4">
            <BookOpen size={36} className="text-indigo-300" />
            <p className="text-indigo-400 text-xs text-center font-medium line-clamp-3">
              {book.title}
            </p>
          </div>
        )}
      </div>
      <div className="space-y-0.5 px-0.5">
        <p className="font-semibold text-black text-sm leading-tight line-clamp-2 group-hover:text-indigo-700 transition-colors">
          {book.title}
        </p>
        <p className="text-xs text-gray-500 truncate">{book.author}</p>
        {book.category && (
          <span className="inline-block text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full mt-1">
            {book.category}
          </span>
        )}
      </div>
    </button>
  );
}

// ─── BookSummaryModal ─────────────────────────────────────────────────────────
function BookSummaryModal({ book, onClose, onListen }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-indigo-200 text-xs font-medium uppercase tracking-wider mb-1 flex items-center gap-1">
                <Sparkles size={12} /> Tóm tắt sách
              </p>
              <h2 className="text-xl font-bold">{book.title}</h2>
              <p className="text-indigo-200 text-sm mt-0.5">{book.author}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors shrink-0"
            >
              <X size={20} />
            </button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          {book.book_summary ? (
            <>
              <p className="text-gray-700 leading-relaxed text-base font-serif italic">
                "{book.book_summary}"
              </p>
              <button
                onClick={() => {
                  onListen(book.book_summary, book.language);
                  onClose();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors text-sm font-medium"
              >
                <Volume2 size={16} /> Nghe tóm tắt
              </button>
            </>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Sparkles size={32} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Chưa có tóm tắt cho cuốn sách này.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── AIChatPanel ──────────────────────────────────────────────────────────────
const INITIAL_MESSAGE = (book) => ({
  role: "assistant",
  content: book
    ? `Chào bạn! Tôi đã đọc "${book.title}" của ${book.author}. Bạn muốn hỏi gì về cuốn sách này?`
    : "Chào bạn! Hãy hỏi tôi bất cứ điều gì về cuốn sách bạn đang đọc!",
});

function AIChatPanel({ book, currentChapter, onClose }) {
  const [messages, setMessages] = useState([INITIAL_MESSAGE(book)]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput("");
    setMessages((p) => [...p, { role: "user", content: userMessage }]);
    setLoading(true);
    try {
      const data = await api.chat({
        message: userMessage,
        bookId: book?.id || null,
        chapterId: currentChapter?.id || null,
        history: messages
          .slice(-CHAT_HISTORY_LIMIT)
          .map((m) => ({ role: m.role, content: m.content })),
      });
      if (data.error) throw new Error(data.error);
      setMessages((p) => [...p, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((p) => [
        ...p,
        {
          role: "assistant",
          content: "Xin lỗi, có lỗi xảy ra. Vui lòng thử lại.",
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const suggestions = book
    ? [
        `"${book.title}" nói về điều gì?`,
        `Tác giả ${book.author} là ai?`,
        currentChapter
          ? `Tóm tắt chương "${currentChapter.title}"`
          : "Chương nào hay nhất?",
        "Bài học quan trọng nhất là gì?",
      ]
    : ["Gợi ý sách hay cho tôi"];

  return (
    <div className="w-96 h-[560px] bg-white rounded-2xl shadow-2xl flex flex-col border border-gray-200 overflow-hidden">
      <div className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <Bot size={18} />
          </div>
          <div>
            <p className="font-semibold text-sm">AI Trợ lý đọc sách</p>
            <p className="text-indigo-200 text-xs">
              {book ? `Đang đọc: ${book.title}` : "Sẵn sàng"}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="hover:bg-white/20 p-1.5 rounded-lg transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                <Bot size={14} className="text-indigo-600" />
              </div>
            )}
            <div
              className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white rounded-tr-none"
                  : "bg-white border border-gray-100 text-gray-700 rounded-tl-none shadow-sm"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
              <Bot size={14} className="text-indigo-600" />
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none p-3 shadow-sm">
              <div className="flex gap-1 items-center h-4">
                {[0, 150, 300].map((d) => (
                  <span
                    key={d}
                    className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${d}ms` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length === 1 && !loading && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => setInput(s)}
              className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={handleSend}
        className="p-3 border-t border-gray-100 flex gap-2 bg-white"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Hỏi về nội dung sách..."
          disabled={loading}
          className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:border-transparent outline-none transition-all disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="p-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-40 shrink-0"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

// ─── HomePage ─────────────────────────────────────────────────────────────────
function HomePage({ onSelectBook }) {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .library()
      .then(setBooks)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center h-full gap-3 text-gray-400">
        <Loader2 size={28} className="animate-spin text-indigo-600" />
        <span>Đang tải thư viện...</span>
      </div>
    );

  if (books.length === 0)
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
        <BookOpen size={48} className="text-gray-200" />
        <h3 className="text-xl font-semibold text-gray-600">
          Thư viện đang trống
        </h3>
      </div>
    );

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto px-8 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-black">Thư viện sách</h2>
          <p className="text-gray-500 text-sm mt-1">{books.length} cuốn sách</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {books.map((book) => (
            <BookCover
              key={book.id}
              book={book}
              onClick={() => onSelectBook(book.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const tts = useTTS();
  const [isAudioVisible, setIsAudioVisible] = useState(false);

  const closeAudio = () => {
    console.log("closeAudio called");
    try {
      tts.stop();
    } catch {
      // ignore
    }
    setIsAudioVisible(false);
  };

  const [currentBookId, setCurrentBookId] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [book, setBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [bookLoading, setBookLoading] = useState(false);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [currentChapterData, setCurrentChapterData] = useState(null);
  const [chapterLoading, setChapterLoading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [showBookSummary, setShowBookSummary] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const lang = book?.language?.startsWith("vi") ? "vi" : "en";

  // Load book + chapters when bookId changes
  useEffect(() => {
    if (!currentBookId) return;
    setBookLoading(true);
    setBook(null);
    setChapters([]);
    setCurrentChapterIndex(0);
    setCurrentChapterData(null);
    setActiveTab("overview");
    setIsSummarizing(false);
    setIsChatOpen(false);

    Promise.all([api.book(currentBookId), api.chapters(currentBookId)])
      .then(([b, ch]) => {
        setBook(b);
        setChapters(ch || []);
      })
      .catch(console.error)
      .finally(() => setBookLoading(false));
  }, [currentBookId]);

  // Load individual chapter content on demand
  useEffect(() => {
    if (!currentBookId || !chapters.length) return;
    const chap = chapters[currentChapterIndex];
    if (!chap) return;
    if (chap.content) {
      setCurrentChapterData(chap);
      return;
    }

    setChapterLoading(true);
    api
      .chapter(currentBookId, chap.chapter_number)
      .then((full) => {
        setChapters((prev) =>
          prev.map((c, i) =>
            i === currentChapterIndex ? { ...c, ...full } : c,
          ),
        );
        setCurrentChapterData(full);
      })
      .catch(console.error)
      .finally(() => setChapterLoading(false));
  }, [currentChapterIndex, currentBookId, chapters.length]); // eslint-disable-line

  const goHome = useCallback(() => {
    // tts.stop();
    setCurrentBookId(null);
    setBook(null);
    setChapters([]);
    setIsChatOpen(false);
  }, [tts]);

  const navigateChapter = useCallback((dir) => {
    setCurrentChapterIndex((p) => p + dir);
    setIsSummarizing(false);
    setCurrentChapterData(null);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-white text-gray-900 font-sans overflow-hidden">
      {/* Header */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-30">
        <button
          onClick={goHome}
          className="flex items-center gap-2 font-bold text-xl text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          <BookOpen size={24} />
          <span>KimQReading</span>
        </button>
        <nav className="flex gap-8">
          {book &&
            ["overview", "reading"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-5 px-1 border-b-2 transition-all ${activeTab === tab ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}
              >
                {tab === "overview" ? "Tổng quan sách" : "Đọc sách"}
              </button>
            ))}
        </nav>
        <div className="w-32 flex justify-end">
          {currentBookId && (
            <button
              onClick={goHome}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors"
            >
              <ArrowLeft size={16} /> Thư viện
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 overflow-hidden relative">
        {/* Home */}
        {!currentBookId && <HomePage onSelectBook={setCurrentBookId} />}

        {/* Loading */}
        {currentBookId && bookLoading && (
          <div className="flex items-center justify-center h-full gap-3 text-gray-400">
            <Loader2 size={28} className="animate-spin text-indigo-600" />
            <span>Đang tải sách...</span>
          </div>
        )}

        {/* Overview */}
        {book && activeTab === "overview" && (
          <div className="max-w-4xl mx-auto py-12 px-6 h-full overflow-y-auto pb-10">
            <div className="flex flex-col md:flex-row gap-10">
              {/* Cover */}
              <div className="w-full md:w-56 shrink-0">
                <div className="aspect-[2/3] bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl shadow-lg overflow-hidden border border-gray-100">
                  {book.cover_url ? (
                    <img
                      src={book.cover_url}
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen size={48} className="text-indigo-300" />
                    </div>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 space-y-5">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight text-black">
                    {book.title}
                  </h1>
                  <p className="text-lg text-gray-500 italic mt-1">
                    Tác giả: {book.author}
                  </p>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  {book.published_year && (
                    <span className="flex items-center gap-1 text-xs px-3 py-1 bg-gray-100 text-gray-600 rounded-full">
                      <Globe size={12} />
                      {book.published_year}
                    </span>
                  )}
                  {book.page_count && (
                    <span className="text-xs px-3 py-1 bg-gray-100 text-gray-600 rounded-full">
                      {book.page_count} trang
                    </span>
                  )}
                  {book.language && (
                    <span className="text-xs px-3 py-1 bg-gray-100 text-gray-600 rounded-full uppercase">
                      {book.language}
                    </span>
                  )}
                  {book.category && (
                    <span className="text-xs px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full">
                      {book.category}
                    </span>
                  )}
                  {chapters.length > 0 && (
                    <span className="text-xs px-3 py-1 bg-green-50 text-green-600 rounded-full">
                      {chapters.length} chương
                    </span>
                  )}
                </div>

                {/* Description */}
                <div className="p-5 bg-white rounded-xl border border-gray-100 shadow-sm">
                  <h3 className="font-bold flex items-center gap-2 text-indigo-600 uppercase text-xs tracking-wider mb-3">
                    <Info size={14} /> Giới thiệu
                  </h3>
                  <p className="text-gray-600 leading-relaxed text-sm">
                    {book.description || (
                      <span className="italic text-gray-400">
                        Chưa có mô tả.
                      </span>
                    )}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 flex-wrap">
                  <button
                    onClick={() => setShowBookSummary(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl font-medium hover:bg-amber-100 transition-colors text-sm"
                  >
                    <Sparkles size={15} /> Tóm tắt sách
                  </button>
                  <button
                    onClick={() => setIsChatOpen(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl font-medium hover:bg-purple-100 transition-colors text-sm"
                  >
                    <Bot size={15} /> Hỏi AI
                  </button>
                  <button
                    onClick={() => setActiveTab("reading")}
                    className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                  >
                    Bắt đầu đọc ngay
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reading */}
        {book && activeTab === "reading" && (
          <div className="flex h-full">
            {/* Sidebar */}
            <aside className="w-60 bg-white overflow-y-auto shrink-0 flex flex-col border-r border-gray-100">
              <div className="p-4 font-bold text-gray-400 uppercase text-xs tracking-widest border-b border-gray-100">
                Danh sách chương
              </div>
              {chapters.map((chap, idx) => (
                <button
                  key={chap.id}
                  onClick={() => {
                    setCurrentChapterIndex(idx);
                    setIsSummarizing(false);
                  }}
                  className={`text-left p-4 transition-all border-l-4 ${currentChapterIndex === idx ? "bg-indigo-50 border-indigo-600 text-indigo-700" : "border-transparent text-black hover:bg-gray-50"}`}
                >
                  <span className="block text-[10px] opacity-50 mb-0.5">
                    Chương {chap.chapter_number}
                  </span>
                  <span className="font-medium text-sm line-clamp-2">
                    {chap.title}
                  </span>
                </button>
              ))}
            </aside>

            {/* Content */}
            <section className="flex-1 overflow-y-auto bg-white pb-32">
              {chapterLoading ? (
                <div className="flex items-center justify-center h-full gap-3 text-gray-400">
                  <Loader2 size={24} className="animate-spin text-indigo-600" />
                  <span>Đang tải chương...</span>
                </div>
              ) : currentChapterData ? (
                <div className="max-w-3xl mx-auto py-14 px-10">
                  {/* Chapter header */}
                  <div className="flex items-start justify-between mb-10 pb-6 border-b border-gray-100 gap-4">
                    <div>
                      <p className="text-xs text-indigo-400 font-medium mb-1 uppercase tracking-wider">
                        Chương {currentChapterData.chapter_number}
                      </p>
                      <h2 className="text-2xl font-bold text-black">
                        {currentChapterData.title}
                      </h2>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => setIsSummarizing((s) => !s)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${isSummarizing ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                      >
                        <FileText size={15} />
                        {isSummarizing ? "Nội dung" : "Tóm tắt"}
                      </button>
                      <button
                        onClick={() => {
                          setIsAudioVisible(true);
                          tts.speak(
                            isSummarizing
                              ? currentChapterData.summary
                              : currentChapterData.content,
                            lang,
                          );
                        }}
                        className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
                      >
                        <Volume2 size={15} /> Nghe
                      </button>
                    </div>
                  </div>

                  {/* Chapter body */}
                  {isSummarizing ? (
                    <div className="bg-amber-50 p-8 rounded-2xl border border-amber-100 shadow-sm">
                      <h4 className="text-amber-800 font-bold mb-4 flex items-center gap-2">
                        <Sparkles size={18} /> Tóm tắt chương
                      </h4>
                      <p className="text-amber-900 leading-relaxed text-lg italic font-serif">
                        "{currentChapterData.summary || "Chưa có tóm tắt."}"
                      </p>
                    </div>
                  ) : (
                    <div className="text-lg leading-[1.85] text-gray-800 font-serif whitespace-pre-wrap">
                      {currentChapterData.content}
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="mt-20 pt-8 border-t border-gray-100 flex justify-between">
                    <button
                      disabled={currentChapterIndex === 0}
                      onClick={() => navigateChapter(-1)}
                      className="flex items-center gap-2 text-gray-400 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      <ChevronLeft size={20} /> Chương trước
                    </button>
                    <button
                      disabled={currentChapterIndex === chapters.length - 1}
                      onClick={() => navigateChapter(1)}
                      className="flex items-center gap-2 text-gray-400 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium"
                    >
                      Chương tiếp theo <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        )}

        <AudioBar tts={tts} visible={isAudioVisible} onClose={closeAudio} />
      </main>

      {/* Book Summary Modal */}
      {showBookSummary && book && (
        <BookSummaryModal
          book={book}
          onClose={() => setShowBookSummary(false)}
          onListen={(text, language) => {
            setIsAudioVisible(true);
            tts.speak(text, language?.startsWith("vi") ? "vi" : "en");
          }}
        />
      )}

      {/* AI Chat */}
      <div className="fixed bottom-6 right-6 z-50">
        {isChatOpen ? (
          <AIChatPanel
            book={book}
            currentChapter={currentChapterData}
            onClose={() => setIsChatOpen(false)}
          />
        ) : (
          <button
            onClick={() => setIsChatOpen(true)}
            className="w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 transition-all active:scale-95"
          >
            <Bot size={26} />
          </button>
        )}
      </div>
    </div>
  );
}
