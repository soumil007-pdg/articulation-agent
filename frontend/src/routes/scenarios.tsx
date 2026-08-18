import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Hermes } from "@/components/mascots";
import { Button } from "@/components/ui/button";
import { SCENARIOS, type Scenario } from "@/lib/scenarios";
import { GOALS, type GoalId } from "@/lib/analysis";
import { queuePractice } from "@/lib/practice-bus";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/scenarios")({
  head: () => ({
    meta: [
      { title: "Scenarios — real moments to rehearse | Articulate AI" },
      {
        name: "description",
        content:
          "Rehearse the moments that actually matter: the toast, the tough question, the elevator pitch, the apology, the ask for a raise.",
      },
      { property: "og:title", content: "Scenarios — real moments to rehearse" },
      {
        property: "og:description",
        content: "Each scenario pre-loads a goal and audience so you can start speaking in one tap.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ScenariosPage,
});

const GOAL_COLOR: Record<GoalId, string> = {
  "professional-update": "#4A72B8",
  "interview-answer": "#E05C5C",
  "persuasive-pitch": "#E8834A",
  "casual-conversation": "#2BA89A",
};

function goalLabel(id: GoalId) {
  return GOALS.find((g) => g.id === id)?.label ?? id;
}

function ScenarioCard({
  scenario,
  index,
  onStart,
}: {
  scenario: Scenario;
  index: number;
  onStart: () => void;
}) {
  const color = GOAL_COLOR[scenario.goal];
  return (
    <article
      className={cn(
        "doodle-card group relative flex flex-col overflow-hidden p-0 transition-transform duration-300",
        "hover:-translate-y-1.5 rise",
      )}
      style={{ animationDelay: `${index * 0.07}s` }}
    >
      <div
        className="relative overflow-hidden px-5 py-4"
        style={{ background: `linear-gradient(135deg, ${color}, ${color}99)`, color: "#fff" }}
      >
        <p className="ui-sans text-[10px] font-extrabold uppercase tracking-[0.24em] opacity-85">
          {goalLabel(scenario.goal)}
        </p>
        <h2 className="text-2xl leading-tight">{scenario.title}</h2>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="hand text-base text-muted-foreground">{scenario.blurb}</p>

        <div className="sticky-note mt-4 p-3.5">
          <p className="ui-sans text-sm leading-relaxed">{scenario.prompt}</p>
        </div>

        <div className="ui-sans mt-3 flex flex-wrap items-center gap-1.5 text-xs">
          <span
            className="rounded-full px-2.5 py-1 font-bold"
            style={{ background: `${color}1f`, color }}
          >
            {scenario.audience}
          </span>
          <span className="rounded-full bg-muted px-2.5 py-1 font-semibold text-muted-foreground">
            ~60 sec
          </span>
        </div>

        <Button
          size="lg"
          className="tactile ui-sans mt-5 w-full rounded-full font-bold"
          style={{ background: color, color: "#fff" }}
          onClick={onStart}
        >
          Practise this
        </Button>
      </div>
    </article>
  );
}

function ScenariosPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<GoalId | "all">("all");

  const list = useMemo(
    () => (filter === "all" ? SCENARIOS : SCENARIOS.filter((s) => s.goal === filter)),
    [filter],
  );

  const start = (s: Scenario) => {
    queuePractice({ prompt: s.prompt, goal: s.goal, audience: s.audience, label: s.title });
    navigate({ to: "/practice" });
  };

  return (
    <AppShell>
      <header className="hero-surface hero-living hero-crimson relative mb-6 overflow-hidden rounded-4xl px-6 py-8 sm:px-10">
        <span className="bloom left-[8%] top-[-20%] size-56" aria-hidden />
        <span className="bloom bottom-[-40%] right-[6%] size-64" aria-hidden />
        <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
          <Hermes expression="idle" size={140} className="breathe shrink-0" />
          <div className="space-y-1.5">
            <p className="ui-sans rise rise-1 text-[11px] font-extrabold uppercase tracking-[0.26em] opacity-85">
              {SCENARIOS.length} real moments
            </p>
            <h1 className="display-lg vt-hero rise rise-2">Scenarios</h1>
            <p className="hand rise rise-3 text-lg opacity-95">
              Rehearse the moment before the moment rehearses you.
            </p>
          </div>
        </div>
      </header>

      <div className="ui-sans mb-5 flex flex-wrap gap-2">
        {(["all", ...GOALS.map((g) => g.id)] as const).map((id) => {
          const active = filter === id;
          const color = id === "all" ? undefined : GOAL_COLOR[id as GoalId];
          return (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id as GoalId | "all")}
              className={cn(
                "tactile rounded-full border-2 px-4 py-1.5 text-sm font-bold transition-colors",
                active
                  ? "border-transparent text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
              style={active ? { background: color ?? "var(--primary)" } : undefined}
              aria-pressed={active}
            >
              {id === "all" ? "All" : goalLabel(id as GoalId)}
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {list.map((s, i) => (
          <ScenarioCard key={s.id} scenario={s} index={i} onStart={() => start(s)} />
        ))}
      </div>

      {list.length === 0 && (
        <p className="hand py-10 text-center text-lg text-muted-foreground">
          No scenarios in that goal yet.
        </p>
      )}
    </AppShell>
  );
}
