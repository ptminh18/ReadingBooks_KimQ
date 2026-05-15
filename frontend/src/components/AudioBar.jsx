import {
  X,
  Volume2,
  RotateCcw,
  Pause,
  Play,
  RotateCw,
  Loader2,
  Gauge,
} from "lucide-react";

export function AudioBar({ tts, onClose }) {
  const {
    status,
    progress,
    duration,
    speed,
    formatTime,
    togglePlay,
    seek,
    cycleSpeed,
    currentText,
  } = tts;
  if (status === "idle") return null;

  const pct = duration ? `${(progress / duration) * 100}%` : "0%";

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-[80vw] bg-white border border-gray-200 rounded-t-2xl px-6 pt-8 pb-4 shadow-xl z-40">
      {/* Close button — absolute inside fixed works fine */}
      <button
        onClick={onClose}
        className="absolute top-3 right-4 text-gray-300 hover:text-red-500 transition-colors"
        title="Đóng"
      >
        <X size={18} />
      </button>

      <div className="max-w-5xl mx-auto flex items-center gap-6">
        {/* Info — desktop only */}
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

          {/* Progress */}
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
