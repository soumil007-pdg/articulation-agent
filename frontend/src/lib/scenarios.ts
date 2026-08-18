import type { Audience, GoalId } from "./analysis";

export type Scenario = {
  id: string;
  title: string;
  blurb: string;
  goal: GoalId;
  audience: Audience;
  prompt: string;
};

export const SCENARIOS: Scenario[] = [
  {
    id: "the-toast",
    title: "The Toast",
    blurb: "Ninety seconds, a room full of friends, and a glass in your hand.",
    goal: "casual-conversation",
    audience: "Friends",
    prompt: "Give a warm toast at a close friend's celebration. Make one person cry, kindly.",
  },
  {
    id: "the-tough-question",
    title: "The Tough Question",
    blurb: "The question you hoped nobody would ask — asked in public.",
    goal: "interview-answer",
    audience: "Interviewer",
    prompt: "Answer: 'Tell me about a time you failed. What did it cost, and what changed after?'",
  },
  {
    id: "the-elevator-pitch",
    title: "The Elevator Pitch",
    blurb: "Thirty floors. One decision-maker. No slides.",
    goal: "persuasive-pitch",
    audience: "Executives",
    prompt: "Pitch your current project in under 60 seconds to an executive who has never heard of it.",
  },
  {
    id: "the-apology",
    title: "The Apology",
    blurb: "Own it cleanly, without excuses or grovelling.",
    goal: "professional-update",
    audience: "General",
    prompt: "Apologise for a missed deadline that affected other people, and say what happens next.",
  },
  {
    id: "the-ask-for-a-raise",
    title: "The Ask for a Raise",
    blurb: "Evidence, calmly delivered, with a number at the end.",
    goal: "persuasive-pitch",
    audience: "Executives",
    prompt: "Make the case for a raise. Lead with impact, end with a specific number.",
  },
  {
    id: "the-standup",
    title: "The Stand-up",
    blurb: "Sixty seconds that shouldn't be a status dump.",
    goal: "professional-update",
    audience: "Technical",
    prompt: "Give a stand-up update that a non-engineer in the room would still find useful.",
  },
  {
    id: "the-panel",
    title: "The Panel Answer",
    blurb: "A microphone, a stage, and a broad question.",
    goal: "persuasive-pitch",
    audience: "Public",
    prompt: "Answer on stage: 'Where is your industry heading in five years?'",
  },
  {
    id: "the-intro",
    title: "The Introduction",
    blurb: "Who you are, in a way people remember tomorrow.",
    goal: "casual-conversation",
    audience: "General",
    prompt: "Introduce yourself at an event so that someone remembers you the next day.",
  },
];
