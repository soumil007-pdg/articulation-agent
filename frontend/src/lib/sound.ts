import { useCallback, useEffect, useState } from "react";

/**
 * Tiny WebAudio sound design: soft celestial chimes on score reveal and
 * milestone moments. Off by default until the user opts in; the preference
 * lives in localStorage and is shared across the app via a window event.
 */

const KEY = "articulate.sound";
const EVENT = "articulate:sound";

export function soundEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(KEY) === "on";
}

export function setSoundEnabled(on: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, on ? "on" : "off");
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function useSound() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    const sync = () => setOn(soundEnabled());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback(() => {
    const next = !soundEnabled();
    setSoundEnabled(next);
    if (next) play("tap");
  }, []);

  return { on, toggle };
}

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function tone(ac: AudioContext, freq: number, at: number, dur: number, gain: number) {
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, ac.currentTime + at);
  amp.gain.setValueAtTime(0.0001, ac.currentTime + at);
  amp.gain.exponentialRampToValueAtTime(gain, ac.currentTime + at + 0.02);
  amp.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + at + dur);
  osc.connect(amp).connect(ac.destination);
  osc.start(ac.currentTime + at);
  osc.stop(ac.currentTime + at + dur + 0.05);
}

/** Pentatonic voicings — never dissonant, never loud. */
const VOICES: Record<string, Array<[number, number, number, number]>> = {
  // freq, delay, duration, gain
  tap: [[880, 0, 0.16, 0.05]],
  reveal: [
    [523.25, 0, 0.55, 0.07],
    [659.25, 0.09, 0.55, 0.06],
    [783.99, 0.18, 0.7, 0.055],
    [1046.5, 0.3, 0.9, 0.04],
  ],
  milestone: [
    [659.25, 0, 0.4, 0.06],
    [987.77, 0.12, 0.6, 0.05],
  ],
};

export type SoundName = keyof typeof VOICES;

export function play(name: SoundName) {
  if (!soundEnabled()) return;
  if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const ac = audio();
  if (!ac) return;
  for (const [freq, at, dur, gain] of VOICES[name] ?? []) tone(ac, freq, at, dur, gain);
}
