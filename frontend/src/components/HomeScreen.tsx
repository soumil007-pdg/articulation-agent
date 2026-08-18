import { useMemo } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AppShell } from "./AppShell";
import { Companion } from "./mascots";
import { Onboarding } from "./Onboarding";
import { Magnetic } from "./Magnetic";
import { Button } from "@/components/ui/button";
import { familyColor } from "@/lib/analysis";
import { computeStreak, sessionsThisWeek, useProfile, useSessions } from "@/lib/storage";
import { queuePractice } from "@/lib/practice-bus";
import { LESSONS } from "@/lib/curriculum";

function StreakFlame() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path
        d="M13 2c1 4-3 5-3 9a3 3 0 0 0 6 0c2 2 3 4 3 6a7 7 0 0 1-14 0c0-6 6-8 8-15z"
        fill="var(--gold)"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const RITUALS = [
  "Describe the best thing that happened this week in exactly five sentences.",
  "Explain what you do for work to someone who has never heard of your field.",
  "Argue for something you believe, then argue the other side fairly.",
  "Tell the story of a small win, ending on the detail that mattered most.",
  "Give a 45-second update on your current project to a busy executive.",
];

function dayIndex(len: number) {
  return Math.floor(Date.now() / 864e5) % len;
}

export function HomeScreen() {
  const { profile, update, ready } = useProfile();
  const sessions = useSessions();
  const navigate = useNavigate();

  const ritual = useMemo(() => RITUALS[dayIndex(RITUALS.length)]!, []);
  const focusLesson = useMemo(() => LESSONS[dayIndex(LESSONS.length)]!, []);

  const streak = computeStreak(sessions);
  const weekCount = sessionsThisWeek(sessions);

  if (ready && !profile.onboarded) {
    return <Onboarding onFinish={() => update({ onboarded: true })} />;
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  function begin(prompt: string, label?: string) {
    queuePractice(label ? { prompt, label } : { prompt });
    navigate({ to: "/practice" });
  }

  return (
    <AppShell>
      {/* The invitation — one screen, one decision */}
      <section className="hero-surface hero-living relative overflow-hidden rounded-4xl px-6 py-12 sm:px-12 sm:py-16">
        <span className="bloom left-[6%] top-[-25%] size-64 bg-white/25" aria-hidden />
        <span className="bloom bottom-[-45%] right-[4%] size-72 bg-white/20" aria-hidden />
        <span className="sun-rays" aria-hidden />

        <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
          <div className="relative">
            <span className="halo-ring" aria-hidden />
            <Companion
              expression={streak > 0 ? "celebrating" : "idle"}
              size={168}
              className="breathe relative"
            />
          </div>

          <p className="eyebrow rise rise-1 mt-6 opacity-85">
            {greeting}
            {profile.name ? `, ${profile.name}` : ""}
          </p>
          <h1 className="display-lg vt-hero rise rise-2 mt-2 text-balance">
            Today's <span className="highlighter">ritual</span>
          </h1>
          <p className="hero-soft rise rise-3 mt-4 text-balance text-xl leading-snug opacity-95">
            {ritual}
          </p>

          <div className="rise rise-4 mt-7">
            <Magnetic strength={0.3}>
              <Button
                size="lg"
                variant="secondary"
                className="tactile rounded-full px-8 text-base font-bold"
                onClick={() => begin(ritual, "Today's ritual")}
              >
                Begin — two minutes
              </Button>
            </Magnetic>
          </div>

          <div className="rise rise-4 mt-6 flex flex-wrap justify-center gap-2.5">
            <span className="ui-sans flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-extrabold">
              <StreakFlame /> {streak}-day streak
            </span>
            <span className="ui-sans rounded-full bg-white/15 px-4 py-2 text-sm font-extrabold">
              {weekCount} this week
            </span>
            <span className="ui-sans rounded-full bg-white/15 px-4 py-2 text-sm font-extrabold">
              {sessions.length} total
            </span>
          </div>
        </div>
      </section>

      {/* Below the fold: two quiet cards, no inputs */}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <section className="doodle-card overflow-hidden p-0">
          <div
            className="px-5 py-4"
            style={{
              background: `linear-gradient(135deg, ${familyColor(focusLesson.family)}, ${familyColor(focusLesson.family)}99)`,
              color: "#fff",
            }}
          >
            <p className="ui-sans text-[11px] font-extrabold uppercase tracking-[0.24em] opacity-85">
              Today's focus · {focusLesson.family}
            </p>
            <h2 className="text-2xl leading-tight">{focusLesson.name}</h2>
          </div>
          <div className="p-5">
            <p className="ui-sans text-sm leading-relaxed text-muted-foreground">
              {focusLesson.definition}
            </p>
            <div className="sticky-note mt-3 p-3.5">
              <p className="hand text-base leading-snug">“{focusLesson.example}”</p>
            </div>
            <Button
              className="tactile ui-sans mt-4 w-full rounded-full font-bold"
              variant="outline"
              onClick={() => begin(focusLesson.drillPrompt, focusLesson.name)}
            >
              Drill {focusLesson.name}
            </Button>
          </div>
        </section>

        <section className="doodle-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl">Recent sessions</h2>
            {sessions.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="ui-sans rounded-full font-bold"
                onClick={() => navigate({ to: "/stats" })}
              >
                See all
              </Button>
            )}
          </div>
          {sessions.length === 0 ? (
            <p className="hand mt-1 text-base text-muted-foreground">
              Your first session shows up here.
            </p>
          ) : (
            <ul className="ui-sans mt-2 space-y-2 text-sm">
              {sessions.slice(0, 3).map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-2xl bg-muted/50 px-3 py-2"
                >
                  <span className="min-w-0 truncate">{s.prompt}</span>
                  <span className="shrink-0 rounded-full bg-primary px-2.5 py-0.5 font-extrabold text-primary-foreground">
                    {Math.round(s.scoring?.overallScore ?? 0)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AppShell>
  );
}
