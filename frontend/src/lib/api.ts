/**
 * Thin service layer for the existing Node/Express + Python coaching backend.
 * The base URL is the ONLY thing to change when pointing at a deployed backend.
 */

export const DEFAULT_API_BASE = "http://localhost:8000";

const OVERRIDE_KEY = "articulate.apiBase";

export function getApiBase(): string {
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(OVERRIDE_KEY);
    if (stored && stored.trim()) return stored.trim().replace(/\/$/, "");
  }
  const envBase = import.meta.env["VITE_API_URL"] as string | undefined;
  return (envBase || DEFAULT_API_BASE).replace(/\/$/, "");
}

export function setApiBase(base: string) {
  if (typeof window === "undefined") return;
  if (base.trim()) window.localStorage.setItem(OVERRIDE_KEY, base.trim());
  else window.localStorage.removeItem(OVERRIDE_KEY);
}

export type HealthStatus = {
  express?: string | boolean;
  python?: string | boolean;
  groq?: string | boolean;
  model?: string;
  [k: string]: unknown;
};

export type SpeechMetrics = {
  transcript?: string;
  transcription?: string;
  text?: string;
  wordCount?: number;
  wpm?: number;
  fillerWords?: unknown;
  sentences?: unknown;
  [k: string]: unknown;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getApiBase()}${path}`, init);
  if (!res.ok) throw new Error(`${path} failed (${res.status})`);
  return (await res.json()) as T;
}

export function getHealth(): Promise<HealthStatus> {
  return request<HealthStatus>("/health");
}

/** POST /coach — returns { text } where text is a JSON string; parsed here. */
export async function coach<T = unknown>(prompt: string): Promise<T> {
  const data = await request<{ text: string }>("/coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });
  return parseModelJson<T>(data?.text ?? "");
}

/** POST /upload-audio — multipart, returns transcription + speech metrics. */
export async function uploadAudio(file: Blob, context?: string): Promise<SpeechMetrics> {
  const form = new FormData();
  form.append("audio", file, "recording.webm");
  if (context) form.append("context", context);
  return request<SpeechMetrics>("/upload-audio", { method: "POST", body: form });
}

/** Models sometimes wrap JSON in prose or code fences — recover it. */
export function parseModelJson<T>(raw: string): T {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start !== -1 && end > start) return JSON.parse(cleaned.slice(start, end + 1)) as T;
    throw new Error("Could not parse analysis response");
  }
}
