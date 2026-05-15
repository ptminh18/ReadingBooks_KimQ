import { BookOpen } from "lucide-react";

export function BookCover({ book, onClick }) {
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
