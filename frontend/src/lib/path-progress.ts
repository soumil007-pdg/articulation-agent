import { useCallback, useEffect, useState } from "react";

const KEY = "articulate.path.completed";
const EVENT = "articulate:path";

export function loadCompleted(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function usePathProgress() {
  const [completed, setCompleted] = useState<string[]>([]);

  useEffect(() => {
    const sync = () => setCompleted(loadCompleted());
    sync();
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);

  const toggle = useCallback((id: string) => {
    const next = loadCompleted().includes(id)
      ? loadCompleted().filter((x) => x !== id)
      : [...loadCompleted(), id];
    window.localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { completed, toggle };
}
