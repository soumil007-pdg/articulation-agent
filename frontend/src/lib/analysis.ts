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

/**
 * `diagnosis` names the problem, `fix` says what to do about it. Sessions saved
 * before the coaching rebuild only carry `justification`, so it stays readable.
 */
export type ScoreEntry = {
  score: number;
  diagnosis?: string;
  fix?: string;
  justification?: string;
};

/** Read off the actual recording — absent for written responses. */
export type DeliveryResult = {
  paceVerdict: string;
  fillerVerdict: string;
  pauseVerdict: string;
  energyVerdict: string;
  perceivedTone: string;
  emotionalRead: string;
  deliveryFix: string;
};

export type ScoringResult = {
  interpretedMeaning: string;
  scores: Record<Dimension, ScoreEntry>;
  overallScore: number;
  keyActionItem: string;
  persuasion: { ethos: number; pathos: number; logos: number; advice: string };
  delivery?: DeliveryResult | null;
};

export type VocabSwap = { from: string; to: string; why: string };
export type VocabUpgrade = { word: string; definition: string; exampleInYourContext: string };
export type Exercise = { title: string; instruction: string; targets: string };

export type CraftResult = {
  vocabulary: { swaps: VocabSwap[]; upgrades: VocabUpgrade[] };
  restructure: { outline: string[]; rewrite: string; whatChanged: string[] };
  exercises: Exercise[];
};

/** What the merged rhetoric + craft call returns before it's split for storage. */
export type CraftBundle = CraftResult & { rhetoric: RhetoricResult };

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
    "clarity": {"score": 0, "diagnosis": "", "fix": ""},
    "conciseness": {"score": 0, "diagnosis": "", "fix": ""},
    "vocabulary": {"score": 0, "diagnosis": "", "fix": ""},
    "structure": {"score": 0, "diagnosis": "", "fix": ""},
    "impact": {"score": 0, "diagnosis": "", "fix": ""},
    "grammar": {"score": 0, "diagnosis": "", "fix": ""},
    "tone": {"score": 0, "diagnosis": "", "fix": ""}
  },
  "overallScore": 0,
  "keyActionItem": "string",
  "persuasion": {"ethos": 10, "pathos": 25, "logos": 65, "advice": "string"},
  "delivery": {
    "paceVerdict": "", "fillerVerdict": "", "pauseVerdict": "",
    "energyVerdict": "", "perceivedTone": "", "emotionalRead": "", "deliveryFix": ""
  }
}`;

/**
 * Rhetoric and craft share one call. They need identical context (the boundary,
 * the goal, the full response), and Groq's free tier allows only 8000 tokens a
 * minute — sending that context twice pushed a single coaching run over the
 * limit and 429'd the last call.
 */
const CRAFT_SCHEMA = `{
  "rhetoric": {
    "found": [{"name": "", "family": "repetition|structure|drama|principles", "evidence": ""}],
    "opportunities": [{"name": "", "family": "", "tip": ""}],
    "overuseWarning": "",
    "rhetoricalScore": 0,
    "summary": "",
    "suggestion": {"device": "", "tip": "", "exampleRewrite": ""}
  },
  "vocabulary": {
    "swaps": [{"from": "", "to": "", "why": ""}],
    "upgrades": [{"word": "", "definition": "", "exampleInYourContext": ""}]
  },
  "restructure": {
    "outline": [""],
    "rewrite": "",
    "whatChanged": [""]
  },
  "exercises": [{"title": "", "instruction": "", "targets": ""}]
}`;

const DEVICE_LIST = LESSONS.map((l) => `${l.name} (${l.family})`).join(", ");

/**
 * Without an explicit boundary the model coaches the *subject matter* — someone
 * describing being ill gets told to see a doctor. Every call gets this prefix.
 */
const BOUNDARY = `CRITICAL BOUNDARY: coach HOW this was communicated, never WHAT it was about.
Never advise on or react to the subject matter of the speaker's life — no health, medical,
relationship, career, financial or wellbeing advice, no sympathy, no suggestions to seek help.
If the content is personal or distressing, coach the communication with the same neutrality you
would apply to a product pitch. Every piece of feedback must be about words, structure, delivery
or rhetoric. Quote the speaker's own words when pointing something out.`;

function header(
  goal: string,
  audience: string,
  prompt: string,
  response: string,
  mode?: "text" | "audio",
  speech?: Record<string, unknown> | null,
) {
  return `You are an expert communication coach.
${BOUNDARY}

Speaking goal: ${goal}
Audience: ${audience}
Practice prompt: ${prompt}
Delivery mode: ${mode === "audio" ? "spoken aloud (transcribed)" : "written"}
${deliveryBlock(mode, speech)}
The user's response:
"""
${response}
"""`;
}

/**
 * The Python service measures pace, fillers, pauses and prosody on every
 * recording. Surfacing those numbers here is what lets the model coach delivery
 * instead of guessing tone from word choice alone.
 */
function deliveryBlock(mode?: "text" | "audio", speech?: Record<string, unknown> | null): string {
  if (mode !== "audio" || !speech) return "MODE NOTE: written response — no delivery data.\n";

  const m = (speech["speech_metrics"] ?? {}) as Record<string, number>;
  const prosody = (speech["prosody"] ?? null) as Record<string, unknown> | null;
  const fillers = (speech["filler_words"] ?? []) as { word: string; count: number }[];

  const lines: string[] = [];
  if (m["words_per_minute"]) {
    lines.push(
      `- ${m["words_per_minute"]} words/min over ${m["duration_seconds"]}s (${m["total_words"]} words). Conversational is 130-150; under 110 drags, over 170 rushes.`,
    );
  }
  if (fillers.length) {
    lines.push(
      `- Fillers: ${m["total_filler_words"] ?? 0} total — ${fillers.map((f) => `"${f.word}" x${f.count}`).join(", ")}`,
    );
  } else if (m["total_filler_words"] === 0) {
    lines.push("- Fillers: none detected.");
  }
  if (m["total_pauses"] !== undefined) {
    lines.push(`- Pauses: ${m["total_pauses"]}, of which ${m["long_pauses"] ?? 0} ran over 1.5s.`);
  }
  if (prosody) {
    const mean = prosody["pitch_mean_hz"];
    const range = prosody["pitch_range_hz"];
    if (mean) {
      lines.push(
        `- Pitch: mean ${mean}Hz, range ${range}Hz. Range under 50Hz reads monotone, over 100Hz reads expressive.`,
      );
    }
    if (prosody["energy_profile"]) {
      lines.push(
        `- Energy across the answer: ${prosody["energy_profile"]}. Silence ratio ${prosody["silence_ratio"] ?? "n/a"}.`,
      );
    }
    const perSentence = (prosody["sentence_wpm"] ?? []) as { sentence: string; wpm: number }[];
    if (perSentence.length > 1) {
      const fastest = perSentence.reduce((a, b) => (b.wpm > a.wpm ? b : a));
      lines.push(`- Fastest sentence at ${fastest.wpm} wpm: "${fastest.sentence.slice(0, 90)}"`);
    }
  }

  if (lines.length === 0) return "MODE NOTE: spoken, but no delivery measurements available.\n";
  return `DELIVERY DATA (measured from the actual recording — cite these numbers, do not guess):
${lines.join("\n")}
`;
}

export function scoreResponse(args: {
  goal: string;
  audience: string;
  prompt: string;
  response: string;
  mode?: "text" | "audio";
  speech?: Record<string, unknown> | null;
}) {
  const p = `${header(args.goal, args.audience, args.prompt, args.response, args.mode, args.speech)}

Score the response on 7 dimensions from 0-100 and analyse its Aristotelian persuasion split (ethos + pathos + logos must sum to 100).

For EVERY dimension return two separate things:
- "diagnosis": what is happening in their words, quoting them. One sentence.
- "fix": the specific change that would raise this score.

The "fix" MUST name their actual content — the exact sentence, phrase or idea to move, cut, merge
or replace. Generic writing advice is a FAILED response. Test each fix: if it could be pasted into
someone else's feedback unchanged, rewrite it.
  BAD:  "Rewrite each sentence to convey a single idea and use transition words."
  BAD:  "Eliminate redundant clauses and keep only essential information."
  GOOD: "Open on 'the script is stuck' — push the Monday-to-Friday timeline into a clause behind it."
  GOOD: "Cut the three 'I don't know' openers; state the doubt once, at the end."

"keyActionItem" is the single highest-leverage change to their COMMUNICATION, and it too must
reference their specific content — never their circumstances, health or plans.
"persuasion.advice" must likewise cite what they actually said, not name the appeals in the abstract.

For the conciseness dimension: deliberate repetition used as a rhetorical device (e.g. anaphora, epistrophe, tricolon, diacope) is a craft strength, not a wordiness flaw — only penalize repetition that is accidental filler, not repetition that clearly builds emphasis or rhythm.

${
  args.mode === "audio" && args.speech
    ? `Fill "delivery" using the measured DELIVERY DATA above — cite the actual numbers. "perceivedTone" and
"emotionalRead" describe how the delivery LANDS on a listener (e.g. "hesitant — the pitch range is
narrow and the long pauses fall mid-clause"), grounded in the pitch/energy/pause figures plus word
choice. They are observations about performance, never claims about the speaker's mental state.
Score the "tone" dimension using this measured data, not guesswork.`
    : `Set "delivery" to null — this was written, so there is no delivery to assess.`
}

Reply with ONLY valid JSON matching this schema, no prose, no code fences:
${SCORING_SCHEMA}`;
  return coach<ScoringResult>(p);
}

/**
 * Second stage: reads the scores from stage one and turns them into things the
 * speaker can use — rhetorical analysis, better words, their own answer rebuilt,
 * and drills aimed at whatever scored lowest.
 */
export function buildCraftPlan(args: {
  goal: string;
  audience: string;
  prompt: string;
  response: string;
  mode?: "text" | "audio";
  scoring: ScoringResult;
  avoidWords?: string[];
}) {
  const dims = DIMENSIONS.map((d) => `${d} ${args.scoring.scores?.[d]?.score ?? "?"}`).join(", ");
  const weakest = DIMENSIONS.map((d) => ({ d, s: args.scoring.scores?.[d]?.score ?? 100 }))
    .sort((a, b) => a.s - b.s)
    .slice(0, 2)
    .map((x) => x.d);
  const avoidLine =
    args.avoidWords && args.avoidWords.length
      ? `\nThey overuse these flabby words: ${args.avoidWords.join(", ")}. Do NOT use any of them in any rewrite you produce — use small, sturdy, concrete words instead.`
      : "";

  const p = `${header(args.goal, args.audience, args.prompt, args.response, args.mode)}

Their scores: ${dims}. Weakest: ${weakest.join(" and ")}.${avoidLine}

Produce a craft plan with four parts.

0. RHETORIC — identify devices actually used (with quoted evidence) and devices that could be added.
   Name each device using ONLY names from this exact catalog (match spelling and casing): ${DEVICE_LIST}.
   Do not invent device names outside this list — if nothing fits, omit it rather than making one up.
   Family must be one of: repetition, structure, drama, principles.
   "rhetoricalScore" is 1-10 where everyday speech scores 2-4.

1. VOCABULARY — this is a vocabulary BUILDER, so it must hand them actual words.
   "swaps": 3-6 entries. "from" MUST be a word or phrase they actually said (quote it exactly);
   "to" is a sharper replacement; "why" is one short clause.
   Target vague, hedging and repeated words.
   Rules — a swap that breaks any of these is worthless:
     · Never swap a word for a synonym at the same register ("maybe" → "perhaps" achieves nothing).
     · Hedges and filler usually want DELETING, not replacing. When the best move is to cut,
       set "to" to "(cut it)" and say what it costs them to keep.
     · Match the ${args.goal} / ${args.audience} register — do not formalise casual speech.
       "I don't know" → "I am uncertain" is wrong for a casual conversation.
     · The replacement must be more concrete or more forceful, never merely longer or fancier.
   "upgrades": 2-4 words they did NOT use but that fit this topic and audience — each with a plain
   "definition" and "exampleInYourContext", a sentence using it about THEIR subject.

2. RESTRUCTURE — rebuild their answer for the stated goal and audience.
   "outline": the skeleton it should have had, 3-5 steps.
   "rewrite": their answer rebuilt. PRESERVE their meaning, their facts and their voice. Do not
   invent content, do not add facts they did not say, do not sanitise their personality into
   corporate neutral, do not remove their subject matter. Same person, same points, better built.
   Usually noticeably shorter. If they rambled, this is where they see the tight version.
   "whatChanged": 2-4 bullets naming each structural move ("moved the actual problem to sentence 1").

3. EXERCISES — 2-3 drills targeting ${weakest.join(" and ")} and the devices they missed.
   "title" is short. "instruction" is a concrete thing to say or write next time, not a concept to
   study. "targets" names the dimension or device it trains.

Reply with ONLY valid JSON matching this schema, no prose, no code fences:
${CRAFT_SCHEMA}`;
  // Four sections in one reply — the default cap truncates it mid-object.
  return coach<CraftBundle>(p, 4500);
}

/**
 * Pulls display-ready delivery figures out of the /transcribe-audio payload.
 *
 * The real numbers live nested under `speech_metrics` and `prosody`; a previous
 * pass filtered the payload's *top level* for scalars, which dropped every
 * metric and kept only `transcript` — rendering the whole transcript inside a
 * stat tile. Read the nested fields explicitly instead.
 */
export function deliveryMetrics(
  speech?: Record<string, unknown> | null,
): { label: string; value: string }[] {
  if (!speech) return [];
  const m = (speech["speech_metrics"] ?? {}) as Record<string, number>;
  const prosody = (speech["prosody"] ?? null) as Record<string, unknown> | null;

  const out: { label: string; value: string }[] = [];
  const push = (label: string, value: unknown, suffix = "") => {
    if (value === undefined || value === null || value === "") return;
    out.push({ label, value: `${value}${suffix}` });
  };

  push("Pace", m["words_per_minute"], " wpm");
  push("Duration", m["duration_seconds"], "s");
  push("Words", m["total_words"]);
  push("Filler words", m["total_filler_words"]);
  push("Pauses", m["total_pauses"]);
  push("Long pauses", m["long_pauses"]);
  if (prosody) {
    push("Avg pitch", prosody["pitch_mean_hz"], " Hz");
    push("Pitch range", prosody["pitch_range_hz"], " Hz");
    const energy = prosody["energy_profile"];
    if (typeof energy === "string") push("Energy", energy.replace(/_/g, " "));
  }
  return out;
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
