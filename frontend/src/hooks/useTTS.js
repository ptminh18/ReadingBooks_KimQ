import { useState, useEffect, useRef, useCallback } from "react";
import { PLAYBACK_SPEEDS } from "../constants";
import { api } from "../api";

export function useTTS() {
  const audioRef = useRef(null);
  const stoppedRef = useRef(false);
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [currentText, setCurrentText] = useState("");

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const onTimeUpdate = () => setProgress(audio.currentTime);
    const onDuration = () => setDuration(audio.duration);
    const onEnded = () => {
      setStatus("idle");
      setProgress(0);
    };
    const onError = () => setStatus("error");
    const onCanPlay = () => {
      if (stoppedRef.current) return;
      audio.playbackRate = speed;
      audio.play().catch(() => setStatus("error"));
      setStatus("playing");
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDuration);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    audio.addEventListener("canplay", onCanPlay);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDuration);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
      audio.removeEventListener("canplay", onCanPlay);
      audio.pause();
      audio.src = "";
    };
  }, []); // eslint-disable-line

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed]);

  const speak = useCallback(
    async (text, language = "vi", gender = "female") => {
      if (!text?.trim()) return;
      const audio = audioRef.current;
      stoppedRef.current = false;
      audio.pause();
      audio.src = "";
      setStatus("loading");
      setCurrentText(text.slice(0, 60) + (text.length > 60 ? "..." : ""));
      setProgress(0);
      setDuration(0);
      try {
        const res = await api.tts(text, language, gender);
        if (!res.ok) {
          const e = await res.json();
          throw new Error(e.error);
        }
        const blob = await res.blob();
        if (stoppedRef.current) return;
        audio.src = URL.createObjectURL(blob);
        audio.load();
      } catch (err) {
        console.error("[TTS]", err);
        setStatus("error");
      }
    },
    [],
  );

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio.src) return;
    if (status === "playing") {
      audio.pause();
      setStatus("paused");
    } else {
      audio.play();
      setStatus("playing");
    }
  }, [status]);

  const seek = useCallback((delta) => {
    const audio = audioRef.current;
    audio.currentTime = Math.max(
      0,
      Math.min(audio.currentTime + delta, audio.duration || 0),
    );
  }, []);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    const audio = audioRef.current;
    audio.pause();
    audio.src = "";
    audio.load();
    setStatus("idle");
    setProgress(0);
    setDuration(0);
    setCurrentText("");
  }, []);

  const cycleSpeed = useCallback(() => {
    setSpeed((s) => {
      const idx = PLAYBACK_SPEEDS.indexOf(s);
      return PLAYBACK_SPEEDS[(idx + 1) % PLAYBACK_SPEEDS.length];
    });
  }, []);

  const formatTime = (s) =>
    isNaN(s)
      ? "0:00"
      : `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  return {
    speak,
    togglePlay,
    seek,
    stop,
    cycleSpeed,
    status,
    progress,
    duration,
    speed,
    formatTime,
    currentText,
  };
}
