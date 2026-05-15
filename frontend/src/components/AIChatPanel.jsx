import { useState, useEffect, useRef } from "react";
import { X, Bot, Send } from "lucide-react";
import { api } from "../api";
import { CHAT_HISTORY_LIMIT } from "../constants";

const initialMessage = (book) => ({
  role: "assistant",
  content: book
    ? `Chào bạn! Tôi đã đọc "${book.title}" của ${book.author}. Bạn muốn hỏi gì về cuốn sách này?`
    : "Chào bạn! Hãy hỏi tôi bất cứ điều gì về cuốn sách bạn đang đọc!",
});

export function AIChatPanel({ book, currentChapter, onClose }) {
  const [messages, setMessages] = useState([initialMessage(book)]);
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
      {/* Header */}
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

      {/* Messages */}
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

      {/* Suggestions */}
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

      {/* Input */}
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
