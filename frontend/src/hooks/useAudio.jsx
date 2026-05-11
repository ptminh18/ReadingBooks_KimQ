import { useState, useEffect, useRef, useCallback } from "react";
import { getTTS } from "../api";

/**
 * useAudio — manages real HTML Audio playback with Google TTS audio from backend.
 *
 * Usage:
 *   const audio = useAudio()
 *   audio.play(text, 'chapter', chapterId)
 */
export function useAudio() {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0); // seconds
  const [duration, setDuration] = useState(0); // seconds
  const [speed, setSpeed] = useState(1);
  const [error, setError] = useState(null);

  // Sync progress every 250ms
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => setProgress(audio.currentTime);
    const onDuration = () => setDuration(audio.duration);
    const onEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onDuration);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onDuration);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  // Apply speed changes to the audio element
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  /**
   * Fetch TTS audio from backend and start playback.
   * If the same audio is already loaded, just toggle play/pause.
   */
  const play = useCallback(
    async (text, type = "chapter", chapterId = null) => {
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      const audio = audioRef.current;

      // Toggle if already loaded
      if (!audio.paused) {
        audio.pause();
        setIsPlaying(false);
        return;
      }
      if (audio.src && !audio.ended) {
        audio.play();
        setIsPlaying(true);
        return;
      }

      // Fetch new audio
      try {
        setIsLoading(true);
        setError(null);
        const { audioUrl } = await getTTS(text, type, chapterId);
        audio.src = audioUrl;
        audio.playbackRate = speed;
        await audio.play();
        setIsPlaying(true);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    },
    [speed],
  );

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      audioRef.current.play();
      setIsPlaying(true);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  const seek = useCallback((seconds) => {
    if (!audioRef.current) return;
    const next = Math.max(
      0,
      Math.min(
        audioRef.current.currentTime + seconds,
        audioRef.current.duration || 0,
      ),
    );
    audioRef.current.currentTime = next;
    setProgress(next);
  }, []);

  const seekTo = useCallback((seconds) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = seconds;
    setProgress(seconds);
  }, []);

  const stop = useCallback(() => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.src = "";
    setIsPlaying(false);
    setProgress(0);
    setDuration(0);
  }, []);

  const cycleSpeed = useCallback(() => {
    const speeds = [0.75, 1, 1.25];
    setSpeed((prev) => {
      const next = speeds[(speeds.indexOf(prev) + 1) % speeds.length];
      if (audioRef.current) audioRef.current.playbackRate = next;
      return next;
    });
  }, []);

  return {
    isPlaying,
    isLoading,
    progress,
    duration,
    speed,
    error,
    play,
    pause,
    toggle,
    seek,
    seekTo,
    stop,
    cycleSpeed,
  };
}
