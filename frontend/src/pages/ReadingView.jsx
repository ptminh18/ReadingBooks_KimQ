/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  BookOpen,
  FileText,
  Volume2,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { getBook } from "../api.js";
import AudioPlayer from "../components/AudioPlayer.jsx";
import AiChat from "../components/AiChat.jsx";
import { useAudio } from "../hooks/useAudio.jsx";

export default function ReadingView() {
  const { bookId, chapterId } = useParams();
  const navigate = useNavigate();
  const audio = useAudio();

  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [playerVisible, setPlayerVisible] = useState(false);

  useEffect(() => {
    setLoading(true);
    getBook(bookId)
      .then((data) => {
        setBook(data);
        // Set initial chapter from URL param if provided
        if (chapterId && data.chapters) {
          const idx = data.chapters.findIndex(
            (c) => String(c.id) === String(chapterId),
          );
          if (idx >= 0) setCurrentIdx(idx);
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [bookId]);

  // Update URL when chapter changes (without full navigation)
  useEffect(() => {
    if (!book?.chapters) return;
    const chapter = book.chapters[currentIdx];
    if (chapter) {
      navigate(`/books/${bookId}/read/${chapter.id}`, { replace: true });
    }
  }, [currentIdx, book]);

  const handleListenChapter = async () => {
    if (!book) return;
    const chapter = book.chapters[currentIdx];
    const textToSpeak = isSummarizing ? chapter.summary : chapter.content;
    setPlayerVisible(true);
    // Stop previous audio before loading new
    audio.stop();
    await audio.play(textToSpeak, "chapter", chapter.id);
  };

  const handleClosePlayer = () => {
    audio.stop();
    setPlayerVisible(false);
  };

  const goToChapter = (idx) => {
    setCurrentIdx(idx);
    setIsSummarizing(false);
    audio.stop();
    setPlayerVisible(false);
  };

  if (loading)
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8F9FA]">
        <Loader2 size={32} className="animate-spin text-indigo-500" />
      </div>
    );

  if (error)
    return (
      <div className="flex h-screen items-center justify-center bg-[#F8F9FA]">
        <p className="text-red-500">Lỗi: {error}</p>
      </div>
    );

  const chapter = book.chapters[currentIdx];

  return (
    <div className="flex flex-col h-screen bg-[#F8F9FA] text-[#2D3436] font-sans overflow-hidden">
      {/* Header */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-2 font-bold text-xl text-indigo-600">
          <BookOpen size={24} />
          <span>WisdomPath</span>
        </div>
        <nav className="flex gap-8">
          <button
            onClick={() => navigate(`/books/${bookId}`)}
            className="py-5 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 transition-all"
          >
            Tổng quan sách
          </button>
          <button className="py-5 px-1 border-b-2 border-indigo-600 text-indigo-600">
            Đọc sách
          </button>
        </nav>
        <div className="w-24" />
      </header>

      {/* Body */}
      <main className="flex-1 overflow-hidden relative">
        <div className="flex h-full pb-32">
          {/* Sidebar */}
          <aside className="w-64 bg-white border-r border-gray-200 overflow-y-auto shrink-0">
            <div className="p-4 font-bold text-gray-400 uppercase text-xs tracking-widest border-b border-gray-50">
              Danh sách chương
            </div>
            <div className="flex flex-col">
              {book.chapters.map((chap, idx) => (
                <button
                  key={chap.id}
                  onClick={() => goToChapter(idx)}
                  className={`text-left p-4 transition-all border-l-4 ${
                    currentIdx === idx
                      ? "bg-indigo-50 border-indigo-600 text-indigo-700"
                      : "border-transparent text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="block text-xs opacity-60 mb-1">
                    Chương {idx + 1}
                  </span>
                  <span className="font-medium text-sm">
                    {chap.title.split(": ")[1] || chap.title}
                  </span>
                </button>
              ))}
            </div>
          </aside>

          {/* Reading area */}
          <section className="flex-1 overflow-y-auto bg-white">
            <div className="max-w-3xl mx-auto py-16 px-10">
              <div className="flex items-center justify-between mb-10 pb-6 border-b border-gray-100">
                <h2 className="text-2xl font-bold text-gray-900">
                  {chapter.title}
                </h2>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsSummarizing((v) => !v)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isSummarizing
                        ? "bg-indigo-600 text-white shadow-md"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    <FileText size={16} />
                    {isSummarizing ? "Xem nội dung" : "Tóm tắt chương"}
                  </button>
                  <button
                    onClick={handleListenChapter}
                    disabled={audio.isLoading}
                    className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors disabled:opacity-60"
                    title="Nghe nội dung chương"
                  >
                    {audio.isLoading ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Volume2 size={18} />
                    )}
                  </button>
                </div>
              </div>

              <div className="prose prose-indigo max-w-none mb-10">
                {isSummarizing ? (
                  <div className="bg-amber-50 p-8 rounded-2xl border border-amber-100 shadow-sm">
                    <h4 className="text-amber-800 font-bold mb-4 flex items-center gap-2">
                      <FileText size={20} /> Nội dung tóm tắt
                    </h4>
                    <p className="text-amber-900 leading-relaxed text-lg italic font-serif">
                      "{chapter.summary}"
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6 text-lg leading-[1.8] text-gray-800 font-serif">
                    {chapter.content.split("\n\n").map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-20 pt-10 border-t border-gray-100 flex justify-between">
                <button
                  disabled={currentIdx === 0}
                  onClick={() => goToChapter(currentIdx - 1)}
                  className="flex items-center gap-2 text-gray-400 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  <ChevronLeft size={20} /> Chương trước
                </button>
                <button
                  disabled={currentIdx === book.chapters.length - 1}
                  onClick={() => goToChapter(currentIdx + 1)}
                  className="flex items-center gap-2 text-gray-400 hover:text-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  Chương tiếp theo <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </section>
        </div>

        <AudioPlayer
          audio={audio}
          label={chapter.title}
          onClose={handleClosePlayer}
          visible={playerVisible}
        />
      </main>

      <AiChat
        bookId={bookId}
        chapterId={chapter.id}
        chapterContent={chapter.content}
      />
    </div>
  );
}
