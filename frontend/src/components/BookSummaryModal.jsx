import { X, Sparkles, Volume2 } from "lucide-react";

export function BookSummaryModal({ book, onClose, onListen }) {
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
