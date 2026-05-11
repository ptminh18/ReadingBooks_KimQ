import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BookOpen, Info, Volume2, Loader2 } from "lucide-react";
import { getBook } from "../api.js";
import AudioPlayer from "../components/AudioPlayer.js";
import { useAudio } from "../hooks/useAudio.js";

export default function BookOverview() {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const audio = useAudio();

  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playerVisible, setPlayerVisible] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    getBook(bookId)
      .then((data) => setBook(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [bookId]);

  const handleListenOverview = async () => {
    if (!book) return;
    setPlayerVisible(true);
    await audio.play(book.summary, "overview");
  };

  const handleClosePlayer = () => {
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

  return (
    <div className="flex flex-col h-screen bg-[#F8F9FA] text-[#2D3436] font-sans overflow-hidden">
      {/* Header */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-2 font-bold text-xl text-indigo-600">
          <BookOpen size={24} />
          <span>WisdomPath</span>
        </div>
        <nav className="flex gap-8">
          <button className="py-5 px-1 border-b-2 border-indigo-600 text-indigo-600">
            Tổng quan sách
          </button>
          <button
            onClick={() => navigate(`/books/${bookId}/read`)}
            className="py-5 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 transition-all"
          >
            Đọc sách
          </button>
        </nav>
        <div className="w-24" />
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-32">
        <div className="max-w-4xl mx-auto py-12 px-6">
          <div className="flex flex-col md:flex-row gap-10">
            {/* Cover */}
            <div className="w-full md:w-1/3">
              {book.cover_url ? (
                <img
                  src={book.cover_url}
                  alt={book.title}
                  className="w-full aspect-[2/3] object-cover rounded-lg shadow-md"
                />
              ) : (
                <div className="aspect-[2/3] bg-gradient-to-br from-indigo-100 to-indigo-200 rounded-lg shadow-md flex items-center justify-center text-indigo-400 border border-indigo-100">
                  <span className="text-center p-4 font-medium">
                    {book.title}
                  </span>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="w-full md:w-2/3 space-y-6">
              <div>
                <h1 className="text-4xl font-bold mb-2 tracking-tight text-gray-900">
                  {book.title}
                </h1>
                <p className="text-xl text-gray-500 italic">
                  Tác giả: {book.author}
                </p>
              </div>

              <div className="p-5 bg-white rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold flex items-center gap-2 text-indigo-600 uppercase text-xs tracking-wider">
                    <Info size={16} /> Thông tin nội dung
                  </h3>
                  <button
                    onClick={handleListenOverview}
                    disabled={audio.isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition-colors text-sm font-medium disabled:opacity-60"
                  >
                    {audio.isLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Volume2 size={16} />
                    )}
                    Nghe tóm tắt tổng quan
                  </button>
                </div>
                <p className="text-gray-600 leading-relaxed">
                  {book.description}
                </p>
                <div className="mt-4 pt-4 border-t border-gray-50">
                  <h4 className="font-semibold mb-2">Tóm tắt cốt lõi:</h4>
                  <p className="text-gray-600 text-sm italic font-serif leading-relaxed">
                    "{book.summary}"
                  </p>
                </div>
              </div>

              <button
                onClick={() => navigate(`/books/${bookId}/read`)}
                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-[0.98]"
              >
                Bắt đầu đọc ngay
              </button>
            </div>
          </div>
        </div>
      </main>

      <AudioPlayer
        audio={audio}
        label="Tóm tắt tổng quan"
        onClose={handleClosePlayer}
        visible={playerVisible}
      />
    </div>
  );
}
