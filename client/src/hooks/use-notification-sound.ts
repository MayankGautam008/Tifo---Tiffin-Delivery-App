import { useRef, useCallback, useEffect } from "react";
import { AUDIO_PATH, AUDIO_VOLUME, BELL_DEBOUNCE_MS, devLog } from "@/lib/notification-constants";

// ---------------------------------------------------------------------------
// useNotificationSound
// ---------------------------------------------------------------------------
// Manages a single HTMLAudioElement:
//   • Preloads the bell MP3 on mount (no first-play delay)
//   • Debounced — 50 rapid calls within BELL_DEBOUNCE_MS produce 1 bell
//   • Non-overlapping — waits for current playback to finish before replaying
//   • Graceful error handling — never throws on audio issues
//   • Cleanup — releases the element on unmount
// ---------------------------------------------------------------------------

export function useNotificationSound() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingPlayRef = useRef(false);

  // ---- Preload on mount ----
  useEffect(() => {
    try {
      const audio = new Audio(AUDIO_PATH);
      audio.volume = AUDIO_VOLUME;
      audio.preload = "auto";

      // When playback finishes, check if another play was queued
      audio.addEventListener("ended", () => {
        isPlayingRef.current = false;
        if (pendingPlayRef.current) {
          pendingPlayRef.current = false;
          playInternal(audio);
        }
      });

      // If an error occurs mid-play, reset state so we don't get stuck
      audio.addEventListener("error", () => {
        isPlayingRef.current = false;
        pendingPlayRef.current = false;
        devLog("Audio error", audio.error?.message);
      });

      audioRef.current = audio;
      devLog("Audio preloaded", AUDIO_PATH);
    } catch (err) {
      devLog("Audio preload failed", err);
    }

    return () => {
      // Cleanup
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
    };
  }, []);

  // ---- Internal play (non-overlapping) ----
  function playInternal(audio: HTMLAudioElement) {
    if (isPlayingRef.current) {
      // Already playing — queue ONE more play after it ends
      pendingPlayRef.current = true;
      return;
    }

    isPlayingRef.current = true;
    audio.currentTime = 0;
    audio.play().catch((err) => {
      // Browser autoplay policy may block — not a crash-worthy error
      isPlayingRef.current = false;
      devLog("Audio play blocked", err?.message);
    });
  }

  // ---- Public API: debounced play ----
  const play = useCallback(() => {
    // Clear any existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      const audio = audioRef.current;
      if (!audio) {
        devLog("Audio element not available");
        return;
      }
      devLog("Bell played");
      playInternal(audio);
    }, BELL_DEBOUNCE_MS);
  }, []);

  // ---- Public API: immediate play (for reminders — no debounce) ----
  const playImmediate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    devLog("Reminder bell played");
    playInternal(audio);
  }, []);

  return { play, playImmediate };
}
