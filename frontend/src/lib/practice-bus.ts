import type { Audience, GoalId } from "./analysis";

export type PracticeRequest = {
  prompt: string;
  goal?: GoalId;
  audience?: Audience;
  label?: string;
};

const KEY = "articulate.pendingPractice";

export function queuePractice(req: PracticeRequest) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(KEY, JSON.stringify(req));
}

export function takePractice(): PracticeRequest | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(KEY);
  if (!raw) return null;
  window.sessionStorage.removeItem(KEY);
  try {
    return JSON.parse(raw) as PracticeRequest;
  } catch {
    return null;
  }
}
