import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  X,
  Gauge,
  Loader2,
} from "lucide-react";

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? "0" : ""}${s}`;
}

/**
 * AudioPlayer
 * Props:
 *   audio        — object returned by useAudio()
 *   label        — string shown in the info area (e.g. chapter title)
 *   onClose      — callback to stop + hide the player
 *   visible      — boolean
 */
export default function AudioPlayer({ audio, label, onClose, visible }) {
  const {
    isPlaying,
    isLoading,
    progress,
    duration,
    speed,
    toggle,
    seek,
    seekTo,
    cycleSpeed,
  } = audio;

  return (
    // <>
    <div
      className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4 z-40
        shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.05)] transition-transform duration-500
        ${visible ? "translate-y-0" : "translate-y-full"}`}
    >
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-4 md:gap-8">
        {/* Info */}
        <div className="hidden lg:flex items-center gap-3 w-64 shrink-0">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
            <Volume2 size={20} />
          </div>
          <div className="overflow-hidden flex-1">
            <p className="text-sm font-bold truncate text-gray-900">
              Đang phát audio
            </p>
            <p className="text-[10px] text-gray-500 truncate uppercase tracking-wider">
              {label}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-red-500 transition-colors ml-1"
          >
            <X size={16} />
          </button>
        </div>

        {/* Controls + Progress */}
        <div className="flex-1 w-full space-y-2">
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => seek(-10)}
              className="text-gray-400 hover:text-indigo-600 transition-colors active:scale-90"
              title="Lùi 10 giây"
            >
              <RotateCcw size={20} />
            </button>

            <button
              onClick={toggle}
              disabled={isLoading}
              className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:scale-105 transition-all shadow-md shadow-indigo-100 active:scale-95 disabled:opacity-70"
            >
              {isLoading ? (
                <Loader2 size={22} className="animate-spin" />
              ) : isPlaying ? (
                <Pause size={24} />
              ) : (
                <Play size={24} className="ml-1" />
              )}
            </button>

            <button
              onClick={() => seek(10)}
              className="text-gray-400 hover:text-indigo-600 transition-colors active:scale-90"
              title="Tiến 10 giây"
            >
              <RotateCw size={20} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono font-bold text-gray-400 w-8">
              {formatTime(progress)}
            </span>
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full relative group cursor-pointer">
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={progress}
                onChange={(e) => seekTo(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div
                className="absolute top-0 left-0 h-full bg-indigo-600 rounded-full"
                style={{
                  width: `${duration ? (progress / duration) * 100 : 0}%`,
                }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-indigo-600 border-2 border-white rounded-full shadow-md scale-0 group-hover:scale-100 transition-transform" />
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold text-gray-400 w-8">
              {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Speed */}
        <div className="flex items-center gap-4 w-64 justify-center md:justify-end">
          <button
            onClick={cycleSpeed}
            className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-gray-600 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-gray-100"
          >
            <Gauge size={16} />
            <span className="text-xs font-bold font-mono">{speed}x</span>
          </button>
        </div>
      </div>
    </div>
    // </>
  );
}
