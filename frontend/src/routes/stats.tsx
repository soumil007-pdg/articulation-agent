import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/AppShell";
import { Calliope } from "@/components/mascots";
import { DIMENSIONS } from "@/lib/analysis";
import { Progress } from "@/components/ui/progress";
import { computeStreak, sessionsThisWeek, useSessions } from "@/lib/storage";

export const Route = createFileRoute("/stats")({
  head: () => ({
    meta: [
      { title: "Stats — your speaking trend | Articulate AI" },
      {
        name: "description",
        content:
          "Track your overall score over time, see which of the seven dimensions is lagging, and count the reps you've put in.",
      },
      { property: "og:title", content: "Stats — your speaking trend" },
      {
        property: "og:description",
        content: "Score trend, per-dimension breakdown, and session count across your practice history.",
      },
    ],
  }),
  component: StatsPage,
});

function StatsInner() {
  const sessions = useSessions();
  const ordered = [...sessions].reverse();

  const chartData = ordered.map((s, i) => ({
    name: `#${i + 1}`,
    score: Math.round(s.scoring?.overallScore ?? 0),
    date: new Date(s.date).toLocaleDateString(),
  }));

  const averages = DIMENSIONS.map((d) => {
    const vals = sessions
      .map((s) => s.scoring?.scores?.[d]?.score)
      .filter((v): v is number => typeof v === "number");
    return {
      dimension: d,
      avg: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0,
    };
  });

  const overallAvg = sessions.length
    ? Math.round(
        sessions.reduce((a, s) => a + (s.scoring?.overallScore ?? 0), 0) / sessions.length,
      )
    : 0;

  return (
    <AppShell>
      <header className="hero-surface hero-living hero-cobalt relative mb-6 overflow-hidden rounded-[2rem] p-7 sm:p-9">
        <div className="bloom -left-16 -top-20 h-64 w-64" aria-hidden />
        <div className="bloom -bottom-24 right-0 h-72 w-72" aria-hidden />
        <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <div className="relative shrink-0">
            <span className="halo-ring" aria-hidden />
            <span className="halo-ring" style={{ animationDelay: "1.4s" }} aria-hidden />
            <div className="breathe">
              <Calliope expression={sessions.length ? "celebrating" : "thinking"} size={130} />
            </div>
          </div>
          <div className="min-w-0 text-center sm:text-left">
            <p className="ui-sans rise rise-1 text-xs uppercase tracking-[0.25em] text-current/70">
              Your practice, so far
            </p>
            <h1 className="display-lg vt-hero rise rise-2 mt-2">
              {sessions.length ? "The shape of you" : "Your chart starts today"}
            </h1>
            <p className="hand rise rise-3 mt-2 text-lg text-current/85">
              {sessions.length
                ? "Calliope keeps the record. Every rep is written down."
                : "One session and the first line appears."}
            </p>
            <div className="rise rise-4 mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
              {[
                ["Average", overallAvg],
                ["Streak", computeStreak(sessions)],
                ["This week", sessionsThisWeek(sessions)],
              ].map(([k, v]) => (
                <span
                  key={String(k)}
                  className="ui-sans rounded-full bg-background/25 px-4 py-1.5 text-sm text-current backdrop-blur-sm"
                >
                  <b className="font-extrabold">{v as number}</b> {k}
                </span>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="mb-5 grid gap-4 sm:grid-cols-4">
        {[
          ["Sessions", sessions.length],
          ["Average score", overallAvg],
          ["Day streak", computeStreak(sessions)],
          ["This week", sessionsThisWeek(sessions)],
        ].map(([k, v], i) => (
          <div
            key={String(k)}
            className="doodle-card rise tactile p-5 text-center"
            style={{ animationDelay: `${0.08 * i}s` }}
          >
            <div className="text-4xl font-extrabold text-primary">{v as number}</div>
            <div className="ui-sans mt-1 text-xs uppercase tracking-widest text-muted-foreground">
              {k}
            </div>
          </div>
        ))}
      </div>

      <div className="doodle-card rise mb-5 p-5" style={{ animationDelay: "0.32s" }}>
        <h2 className="text-xl">Score trend</h2>
        <div className="mt-3 h-72 w-full">
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ left: -20, right: 8, top: 8 }}>
                <CartesianGrid strokeDasharray="4 6" stroke="var(--border)" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis domain={[0, 100]} tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 14,
                    border: "2px solid var(--border)",
                    background: "var(--card)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="score"
                  stroke="var(--brand)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "var(--gold)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="hand flex h-full items-center justify-center text-lg text-muted-foreground">
              Two sessions and this chart comes alive.
            </p>
          )}
        </div>
      </div>

      <div className="doodle-card rise p-5" style={{ animationDelay: "0.4s" }}>
        <h2 className="text-xl">Per-dimension averages</h2>
        <p className="hand text-muted-foreground">Where the practice is landing.</p>
        <div className="mt-4 grid gap-5 sm:grid-cols-2">
          {averages.map((a, i) => (
            <div
              key={a.dimension}
              className="rise space-y-2 rounded-2xl bg-muted/40 p-4"
              style={{ animationDelay: `${0.44 + 0.05 * i}s` }}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate font-bold capitalize">{a.dimension}</span>
                <span className="ui-sans shrink-0 rounded-full bg-background px-2.5 py-0.5 text-sm text-muted-foreground">
                  {a.avg}/100
                </span>
              </div>
              <Progress value={a.avg} className="h-3 rounded-full" />
            </div>
          ))}
        </div>
      </div>

    </AppShell>
  );
}

function StatsPage() {
  return (
    <ClientOnly fallback={<AppShell><div className="h-96" /></AppShell>}>
      <StatsInner />
    </ClientOnly>
  );
}
