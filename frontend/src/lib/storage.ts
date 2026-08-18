import { useCallback, useEffect, useState } from "react";
import type { RhetoricResult, ScoringResult } from "./analysis";
import type { NoonanResult } from "./noonan";

export type Session = {
  id: string;
  date: string; // ISO
  goal: string;
  audience: string;
  prompt: string;
  response: string;
  mode: "text" | "audio";
  scoring: ScoringResult;
  rhetoric?: RhetoricResult | null;
  noonan: NoonanResult;
  speech?: Record<string, unknown> | null;
};

export type Profile = {
  name: string;
  email: string;
  theme: "light" | "dark";
  defaultMode: "text" | "audio";
  onboarded: boolean;
};

const SESSIONS_KEY = "articulate.sessions";
const PROFILE_KEY = "articulate.profile";

export const DEFAULT_PROFILE: Profile = {
  name: "",
  email: "",
  theme: "light",
  defaultMode: "text",
  onboarded: false,
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? ({ ...fallback, ...JSON.parse(raw) } as T) : fallback;
  } catch {
    return fallback;
  }
}

export function loadSessions(): Session[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(SESSIONS_KEY) ?? "[]") as Session[];
  } catch {
    return [];
  }
}

export function saveSession(session: Session) {
  const all = [session, ...loadSessions()].slice(0, 200);
  window.localStorage.setItem(SESSIONS_KEY, JSON.stringify(all));
  window.dispatchEvent(new Event("articulate:sessions"));
}

export function clearSessions() {
  window.localStorage.removeItem(SESSIONS_KEY);
  window.dispatchEvent(new Event("articulate:sessions"));
}

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  useEffect(() => {
    const sync = () => setSessions(loadSessions());
    sync();
    window.addEventListener("articulate:sessions", sync);
    return () => window.removeEventListener("articulate:sessions", sync);
  }, []);
  return sessions;
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setProfile(read<Profile>(PROFILE_KEY, DEFAULT_PROFILE));
    setReady(true);
  }, []);

  const update = useCallback((patch: Partial<Profile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.classList.toggle("dark", profile.theme === "dark");
  }, [profile.theme, ready]);

  return { profile, update, ready };
}

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function computeStreak(sessions: Session[]): number {
  const days = new Set(sessions.map((s) => dayKey(new Date(s.date))));
  if (days.size === 0) return 0;
  let streak = 0;
  const cursor = new Date();
  if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function sessionsThisWeek(sessions: Session[]): number {
  const cutoff = Date.now() - 7 * 864e5;
  return sessions.filter((s) => new Date(s.date).getTime() >= cutoff).length;
}
