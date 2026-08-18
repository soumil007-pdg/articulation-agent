/**
 * Noonan craft check — Peggy Noonan's "small, sturdy words" test.
 * Fully client-side, instant, no API cost.
 */

const FLABBY = [
  "utilize",
  "leverage",
  "facilitate",
  "implement",
  "optimize",
  "synergy",
  "paradigm",
  "methodology",
  "functionality",
  "actionable",
  "deliverable",
  "bandwidth",
  "holistic",
  "robust",
  "scalable",
  "ideate",
  "operationalize",
  "incentivize",
  "endeavor",
  "commence",
  "subsequently",
  "aforementioned",
  "utilization",
  "prioritization",
  "communication",
  "implementation",
  "consideration",
];

const HEDGES = [
  "just",
  "really",
  "very",
  "basically",
  "actually",
  "kind of",
  "sort of",
  "i think",
  "i guess",
  "maybe",
  "somewhat",
  "perhaps",
  "quite",
  "literally",
];

export type NoonanResult = {
  wordCount: number;
  sentenceCount: number;
  avgSentenceLength: number;
  shortWordShare: number; // % of words with <= 5 letters
  longWords: string[];
  flabbyWords: string[];
  hedges: string[];
  longestSentence: string;
  score: number; // 0-100
  verdict: string;
};

export function noonanCheck(text: string): NoonanResult {
  const clean = text.trim();
  const words = clean.match(/[A-Za-z']+/g) ?? [];
  const sentences = clean
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const wordCount = words.length;
  const lower = words.map((w) => w.toLowerCase());
  const shortWords = lower.filter((w) => w.length <= 5).length;
  const shortWordShare = wordCount ? Math.round((shortWords / wordCount) * 100) : 0;

  const longWords = Array.from(new Set(lower.filter((w) => w.length >= 12)));
  const flabbyWords = Array.from(new Set(lower.filter((w) => FLABBY.includes(w))));
  // Strip punctuation to spaces (not just letters) so hedges adjacent to commas/
  // periods ("I guess," "actually.") are still matched as whole words/phrases.
  const hay = ` ${clean.toLowerCase().replace(/[^a-z0-9']+/g, " ").replace(/\s+/g, " ")} `;
  const hedges = HEDGES.filter((h) => hay.includes(` ${h} `));

  const avgSentenceLength = sentences.length ? Math.round(wordCount / sentences.length) : wordCount;
  const longestSentence = sentences.reduce(
    (a, b) => (b.split(/\s+/).length > a.split(/\s+/).length ? b : a),
    sentences[0] ?? "",
  );

  let score = 100;
  score -= Math.max(0, 70 - shortWordShare) * 1.2;
  score -= flabbyWords.length * 6;
  score -= hedges.length * 3;
  score -= Math.max(0, avgSentenceLength - 20) * 2;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const verdict =
    score >= 80
      ? "Small, sturdy words. This lands."
      : score >= 60
        ? "Mostly sturdy — a few phrases are carrying extra weight."
        : "Too much scaffolding. Swap the long words for short ones.";

  return {
    wordCount,
    sentenceCount: sentences.length,
    avgSentenceLength,
    shortWordShare,
    longWords,
    flabbyWords,
    hedges,
    longestSentence,
    score,
    verdict,
  };
}
