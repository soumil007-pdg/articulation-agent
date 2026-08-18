import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DIMENSIONS, familyColor, type RhetoricResult, type ScoringResult } from "@/lib/analysis";
import type { NoonanResult } from "@/lib/noonan";
import { PersuasionTriangle } from "./PersuasionTriangle";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { play } from "@/lib/sound";

function ScoreRing({ score }: { score: number }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  return (
    <svg viewBox="0 0 120 120" className="size-32">
      <circle cx="60" cy="60" r={r} fill="none" stroke="var(--muted)" strokeWidth="12" />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        stroke="var(--brand)"
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={`${c * pct} ${c}`}
        transform="rotate(-90 60 60)"
      />
      <text x="60" y="68" textAnchor="middle" fontSize="30" fontWeight="800" fill="currentColor">
        {Math.round(score)}
      </text>
    </svg>
  );
}

function DeviceChip({ name, family }: { name: string; family?: string }) {
  const color = familyColor(family);
  return (
    <span
      className="ui-sans inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-1 text-sm font-semibold"
      style={{ borderColor: color, color, backgroundColor: `${color}1A` }}
    >
      <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
      {name}
    </span>
  );
}

export function ResultsView({
  scoring,
  rhetoric,
  noonan,
  response,
  speech,
}: {
  scoring: ScoringResult;
  rhetoric?: RhetoricResult | null;
  noonan: NoonanResult;
  response: string;
  speech?: Record<string, unknown> | null;
}) {
  const [copied, setCopied] = useState(false);

  // score reveal chime
  useEffect(() => {
    play("reveal");
  }, []);

  const exportText = () => {
    const lines = [
      `Articulate AI — session report`,
      `Overall: ${scoring.overallScore}`,
      ``,
      `What the coach heard: ${scoring.interpretedMeaning}`,
      ``,
      ...DIMENSIONS.map(
        (d) => `${d}: ${scoring.scores?.[d]?.score ?? "—"} — ${scoring.scores?.[d]?.justification ?? ""}`,
      ),
      ``,
      `Persuasion — ethos ${scoring.persuasion?.ethos}% / pathos ${scoring.persuasion?.pathos}% / logos ${scoring.persuasion?.logos}%`,
      `Key action: ${scoring.keyActionItem}`,
      ``,
      `Your response:`,
      response,
    ];
    return lines.join("\n");
  };

  const copy = async () => {
    await navigator.clipboard.writeText(exportText());
    setCopied(true);
    toast.success("Report copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    const blob = new Blob([exportText()], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `articulate-session-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="doodle-card flex flex-col items-center gap-5 p-6 sm:flex-row sm:items-start">
        <ScoreRing score={scoring.overallScore ?? 0} />
        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="text-2xl">What the coach heard</h2>
          <p className="hand text-lg leading-snug">{scoring.interpretedMeaning}</p>
          <div className="sticky-note mt-3 inline-block max-w-xl px-4 py-3">
            <div className="ui-sans text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Key action item
            </div>
            <div className="text-base font-bold">{scoring.keyActionItem}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={copy} className="ui-sans">
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button variant="outline" onClick={download} className="ui-sans">
            Export
          </Button>
        </div>
      </div>

      <div className="doodle-card p-6">
        <h3 className="text-xl">Seven dimensions</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {DIMENSIONS.map((d) => {
            const entry = scoring.scores?.[d];
            return (
              <div key={d} className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-base font-bold capitalize">{d}</span>
                  <span className="ui-sans text-sm font-semibold text-muted-foreground">
                    {entry?.score ?? "—"}/100
                  </span>
                </div>
                <Progress value={entry?.score ?? 0} className="h-2.5" />
                <p className="ui-sans text-sm text-muted-foreground">{entry?.justification}</p>
              </div>
            );
          })}
        </div>
      </div>

      {scoring.persuasion && (
        <PersuasionTriangle value={scoring.persuasion} advice={scoring.persuasion.advice} />
      )}

      <div className="doodle-card p-6">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-xl">Noonan craft check</h3>
          <span className="ui-sans text-sm font-semibold text-muted-foreground">
            {noonan.score}/100 · instant, on-device
          </span>
        </div>
        <p className="hand text-base">{noonan.verdict}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          {[
            ["Words", noonan.wordCount],
            ["Sentences", noonan.sentenceCount],
            ["Avg length", `${noonan.avgSentenceLength}w`],
            ["Short words", `${noonan.shortWordShare}%`],
          ].map(([k, v]) => (
            <div key={String(k)} className="doodle-soft p-3 text-center">
              <div className="text-2xl font-extrabold">{v}</div>
              <div className="ui-sans text-xs text-muted-foreground">{k}</div>
            </div>
          ))}
        </div>
        {(noonan.flabbyWords.length > 0 || noonan.hedges.length > 0) && (
          <div className="mt-4 space-y-2">
            {noonan.flabbyWords.length > 0 && (
              <p className="ui-sans text-sm">
                <span className="font-semibold">Swap these for shorter words:</span>{" "}
                {noonan.flabbyWords.join(", ")}
              </p>
            )}
            {noonan.hedges.length > 0 && (
              <p className="ui-sans text-sm">
                <span className="font-semibold">Hedges you can cut:</span> {noonan.hedges.join(", ")}
              </p>
            )}
          </div>
        )}
      </div>

      {rhetoric && (
        <div className="doodle-card space-y-4 p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-xl">Rhetorical craft</h3>
            <div className="text-right">
              <div className="text-2xl font-extrabold">{rhetoric.rhetoricalScore}/10</div>
              <div className="ui-sans text-xs text-muted-foreground">
                most everyday speech scores 2–4
              </div>
            </div>
          </div>
          {rhetoric.summary && <p className="hand text-lg leading-snug">{rhetoric.summary}</p>}

          {rhetoric.found?.length > 0 && (
            <div>
              <div className="ui-sans mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Devices you used
              </div>
              <div className="flex flex-wrap gap-2">
                {rhetoric.found.map((d, i) => (
                  <DeviceChip key={i} name={d.name} family={d.family} />
                ))}
              </div>
              <ul className="ui-sans mt-3 space-y-1.5 text-sm text-muted-foreground">
                {rhetoric.found
                  .filter((d) => d.evidence)
                  .map((d, i) => (
                    <li key={i}>
                      <span className="font-semibold text-foreground">{d.name}:</span> “{d.evidence}”
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {rhetoric.opportunities?.length > 0 && (
            <div>
              <div className="ui-sans mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
                Opportunities
              </div>
              <div className="flex flex-wrap gap-2">
                {rhetoric.opportunities.map((d, i) => (
                  <DeviceChip key={i} name={d.name} family={d.family} />
                ))}
              </div>
              <ul className="ui-sans mt-3 space-y-1.5 text-sm text-muted-foreground">
                {rhetoric.opportunities
                  .filter((d) => d.tip)
                  .map((d, i) => (
                    <li key={i}>
                      <span className="font-semibold text-foreground">{d.name}:</span> {d.tip}
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {rhetoric.overuseWarning && (
            <p className="ui-sans rounded-2xl bg-accent p-3 text-sm text-accent-foreground">
              {rhetoric.overuseWarning}
            </p>
          )}

          {rhetoric.suggestion?.device && (
            <div className="doodle-soft space-y-1.5 p-4">
              <div className="ui-sans text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Try this next: {rhetoric.suggestion.device}
              </div>
              <p className="ui-sans text-sm">{rhetoric.suggestion.tip}</p>
              {rhetoric.suggestion.exampleRewrite && (
                <p className="hand text-base">“{rhetoric.suggestion.exampleRewrite}”</p>
              )}
            </div>
          )}
        </div>
      )}

      {speech && (
        <div className="doodle-card p-6">
          <h3 className="text-xl">Speech metrics</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {Object.entries(speech)
              .filter(([, v]) => typeof v === "number" || typeof v === "string")
              .slice(0, 9)
              .map(([k, v]) => (
                <div key={k} className="doodle-soft p-3">
                  <div className="ui-sans text-xs uppercase text-muted-foreground">{k}</div>
                  <div className="truncate text-lg font-bold">{String(v)}</div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
