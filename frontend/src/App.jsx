/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useCallback } from "react";
import {
  BookOpen,
  FileText,
  ChevronLeft,
  ChevronRight,
  Volume2,
  Info,
  Globe,
  Loader2,
  ArrowLeft,
  Sparkles,
  Bot,
} from "lucide-react";

import { api } from "./api";
import { useTTS } from "./hooks/useTTS";
import { AudioBar } from "./components/AudioBar";
// import { BookCover } from "./components/BookCover";
import { BookSummaryModal } from "./components/BookSummaryModal";
import { AIChatPanel } from "./components/AIChatPanel";
import { HomePage } from "./components/HomePage";

export default function App() {
  const tts = useTTS();

  // ── Navigation ──────────────────────────────────────────────────────────────
  const [currentBookId, setCurrentBookId] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  // ── Book data ───────────────────────────────────────────────────────────────
  const [book, setBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [bookLoading, setBookLoading] = useState(false);

  // ── Reading state ───────────────────────────────────────────────────────────
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [currentChapterData, setCurrentChapterData] = useState(null);
  const [chapterLoading, setChapterLoading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [showBookSummary, setShowBookSummary] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  const lang = book?.language?.startsWith("vi") ? "vi" : "en";

  // ── Load book + chapters when navigating to a book ──────────────────────────
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

  // ── Load chapter content on demand ─────────────────────────────────────────
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
    tts.stop();
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

  const handleListen = useCallback(
    (text, language) => {
      tts.speak(text, language?.startsWith("vi") ? "vi" : "en");
    },
    [tts],
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-white text-gray-900 font-sans overflow-hidden">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
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

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden relative">
        {/* Home page */}
        {!currentBookId && <HomePage onSelectBook={setCurrentBookId} />}

        {/* Book loading */}
        {currentBookId && bookLoading && (
          <div className="flex items-center justify-center h-full gap-3 text-gray-400">
            <Loader2 size={28} className="animate-spin text-indigo-600" />
            <span>Đang tải sách...</span>
          </div>
        )}

        {/* ── Overview tab ──────────────────────────────────────────────────── */}
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

                {/* Metadata badges */}
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

        {/* ── Reading tab ────────────────────────────────────────────────────── */}
        {book && activeTab === "reading" && (
          <div className="flex h-full">
            {/* Chapter sidebar */}
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

            {/* Chapter content */}
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
                        onClick={() =>
                          tts.speak(
                            isSummarizing
                              ? currentChapterData.summary
                              : currentChapterData.content,
                            lang,
                          )
                        }
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

                  {/* Chapter navigation */}
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

        {/* Audio bar — hides itself when status is idle */}
        <AudioBar tts={tts} onClose={tts.stop} />
      </main>

      {/* ── Modals & overlays ─────────────────────────────────────────────────── */}

      {showBookSummary && book && (
        <BookSummaryModal
          book={book}
          onClose={() => setShowBookSummary(false)}
          onListen={handleListen}
        />
      )}

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
