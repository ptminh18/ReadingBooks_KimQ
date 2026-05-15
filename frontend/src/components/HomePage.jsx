import { useState, useEffect } from "react";
import { BookOpen, Loader2 } from "lucide-react";
import { api } from "../api";
import { BookCover } from "./BookCover";

export function HomePage({ onSelectBook }) {
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
