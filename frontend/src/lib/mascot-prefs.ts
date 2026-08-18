import { useCallback, useEffect, useState } from "react";

export type CompanionId = "peitho" | "calliope" | "hermes";
export type MascotAccent = "ember" | "violet" | "emerald" | "rose" | "none";
export type MascotAccessory = "none" | "sparkles" | "halo" | "crown";
export type MascotMotion = "still" | "calm" | "lively";

export type MascotPrefs = {
  /** Companion shown in the Home hero and other "your coach" slots. */
  companion: CompanionId;
  accent: MascotAccent;
  accessory: MascotAccessory;
  motion: MascotMotion;
  /** Mascots answer taps with a little quip bubble. */
  reactions: boolean;
};

export const DEFAULT_MASCOT_PREFS: MascotPrefs = {
  companion: "peitho",
  accent: "none",
  accessory: "none",
  motion: "calm",
  reactions: true,
};

const KEY = "articulate.mascot";
const EVENT = "articulate:mascot";

export const COMPANION_LABEL: Record<CompanionId, string> = {
  peitho: "Peitho — warmth",
  calliope: "Calliope — craft",
  hermes: "Hermes — delivery",
};

export const ACCENT_SWATCH: Record<MascotAccent, string> = {
  none: "transparent",
  ember: "oklch(0.75 0.16 58)",
  violet: "oklch(0.68 0.18 300)",
  emerald: "oklch(0.72 0.15 165)",
  rose: "oklch(0.72 0.16 15)",
};

/** Aura tint applied behind the art, so the illustration itself stays clean. */
export const ACCENT_GLOW: Record<MascotAccent, string> = {
  none: "transparent",
  ember: "oklch(0.75 0.16 58 / 0.45)",
  violet: "oklch(0.68 0.18 300 / 0.45)",
  emerald: "oklch(0.72 0.15 165 / 0.42)",
  rose: "oklch(0.72 0.16 15 / 0.42)",
};

export function loadMascotPrefs(): MascotPrefs {
  if (typeof window === "undefined") return DEFAULT_MASCOT_PREFS;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw
      ? { ...DEFAULT_MASCOT_PREFS, ...(JSON.parse(raw) as Partial<MascotPrefs>) }
      : DEFAULT_MASCOT_PREFS;
  } catch {
    return DEFAULT_MASCOT_PREFS;
  }
}

export function saveMascotPrefs(next: MascotPrefs) {
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(EVENT));
}

export function useMascotPrefs() {
  const [prefs, setPrefs] = useState<MascotPrefs>(DEFAULT_MASCOT_PREFS);

  useEffect(() => {
    const sync = () => setPrefs(loadMascotPrefs());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const update = useCallback((patch: Partial<MascotPrefs>) => {
    const next = { ...loadMascotPrefs(), ...patch };
    saveMascotPrefs(next);
    setPrefs(next);
  }, []);

  return { prefs, update };
}

const QUIPS: Record<CompanionId, string[]> = {
  peitho: ["Say it warmer.", "I'm listening.", "Kind, then clear.", "One honest line."],
  calliope: ["Craft beats luck.", "Try the rule of three.", "Write it shorter.", "Again, slower."],
  hermes: ["Land the ending.", "Breathe, then go.", "Pace it out.", "Deliver it clean."],
};

export function randomQuip(who: CompanionId) {
  const list = QUIPS[who];
  return list[Math.floor(Math.random() * list.length)] ?? list[0]!;
}
