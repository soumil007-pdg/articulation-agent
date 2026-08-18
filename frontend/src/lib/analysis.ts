import { coach } from "./api";
import { LESSONS } from "./curriculum";

export type Dimension =
  | "clarity"
  | "conciseness"
  | "vocabulary"
  | "structure"
  | "impact"
  | "grammar"
  | "tone";

export const DIMENSIONS: Dimension[] = [
  "clarity",
  "conciseness",
  "vocabulary",
  "structure",
  "impact",
  "grammar",
  "tone",
];

export type ScoreEntry = { score: number; justification: string };

export type ScoringResult = {
  interpretedMeaning: string;
  scores: Record<Dimension, ScoreEntry>;
  overallScore: number;
  keyActionItem: string;
  persuasion: { ethos: number; pathos: number; logos: number; advice: string };
};

export type RhetoricDevice = { name: string; family: string; evidence?: string; tip?: string };

export type RhetoricResult = {
  found: RhetoricDevice[];
  opportunities: RhetoricDevice[];
  overuseWarning: string;
  rhetoricalScore: number;
  summary: string;
  suggestion: { device: string; tip: string; exampleRewrite: string };
};

export const GOALS = [
  { id: "professional-update", label: "Professional Update" },
  { id: "interview-answer", label: "Interview Answer" },
  { id: "persuasive-pitch", label: "Persuasive Pitch" },
  { id: "casual-conversation", label: "Casual Conversation" },
] as const;

export const AUDIENCES = [
  "General",
  "Executives",
  "Technical",
  "Interviewer",
  "Public",
  "Friends",
] as const;

export type GoalId = (typeof GOALS)[number]["id"];
export type Audience = (typeof AUDIENCES)[number];

const SCORING_SCHEMA = `{
  "interpretedMeaning": "string",
  "scores": {
    "clarity": {"score": 0, "justification": ""},
    "conciseness": {"score": 0, "justification": ""},
    "vocabulary": {"score": 0, "justification": ""},
    "structure": {"score": 0, "justification": ""},
    "impact": {"score": 0, "justification": ""},
    "grammar": {"score": 0, "justification": ""},
    "tone": {"score": 0, "justification": ""}
  },
  "overallScore": 0,
  "keyActionItem": "string",
  "persuasion": {"ethos": 10, "pathos": 25, "logos": 65, "advice": "string"}
}`;

const RHETORIC_SCHEMA = `{
  "found": [{"name": "", "family": "repetition|structure|drama|principles", "evidence": ""}],
  "opportunities": [{"name": "", "family": "", "tip": ""}],
  "overuseWarning": "",
  "rhetoricalScore": 0,
  "summary": "",
  "suggestion": {"device": "", "tip": "", "exampleRewrite": ""}
}`;

const DEVICE_LIST = LESSONS.map((l) => `${l.name} (${l.family})`).join(", ");

function header(goal: string, audience: string, prompt: string, response: string) {
  return `You are an expert communication coach.
Speaking goal: ${goal}
Audience: ${audience}
Practice prompt: ${prompt}
The user's response:
"""
${response}
"""`;
}

export function scoreResponse(args: {
  goal: string;
  audience: string;
  prompt: string;
  response: string;
}) {
  const p = `${header(args.goal, args.audience, args.prompt, args.response)}

Score the response on 7 dimensions from 0-100 and analyse its Aristotelian persuasion split (ethos + pathos + logos must sum to 100).
For the conciseness dimension: deliberate repetition used as a rhetorical device (e.g. anaphora, epistrophe, tricolon, diacope) is a craft strength, not a wordiness flaw — only penalize repetition that is accidental filler, not repetition that clearly builds emphasis or rhythm.
Reply with ONLY valid JSON matching this schema, no prose, no code fences:
${SCORING_SCHEMA}`;
  return coach<ScoringResult>(p);
}

export function analyzeRhetoric(args: {
  goal: string;
  audience: string;
  prompt: string;
  response: string;
  avoidWords?: string[];
}) {
  const avoidLine =
    args.avoidWords && args.avoidWords.length
      ? `\nThe response was already flagged for overusing these jargon/flabby words: ${args.avoidWords.join(", ")}. Do NOT use any of them in "suggestion.exampleRewrite" — write that rewrite using small, sturdy, concrete words instead.`
      : "";
  const p = `${header(args.goal, args.audience, args.prompt, args.response)}

Identify rhetorical devices actually used (with quoted evidence) and devices that could be added. Name each device using ONLY names from this exact catalog (match spelling and casing): ${DEVICE_LIST}. Do not invent device names outside this list — if nothing in the catalog fits, omit it rather than making one up. Family must be one of: repetition, structure, drama, principles. rhetoricalScore is 1-10 where everyday speech scores 2-4.${avoidLine}
Reply with ONLY valid JSON matching this schema, no prose, no code fences:
${RHETORIC_SCHEMA}`;
  return coach<RhetoricResult>(p);
}

export const FAMILY_COLORS: Record<string, string> = {
  repetition: "#E8834A",
  structure: "#4A72B8",
  drama: "#2BA89A",
  principles: "#E05C5C",
};

export function familyColor(family?: string) {
  return FAMILY_COLORS[(family || "").toLowerCase()] ?? FAMILY_COLORS["principles"]!;
}
