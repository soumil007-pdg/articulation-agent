import { Peitho } from "./mascots";
import { cn } from "@/lib/utils";

export const STAGES = ["Scoring", "Vocabulary", "Structure", "Rhetoric", "Exercises"] as const;
export type Stage = (typeof STAGES)[number];

export function AnalysisProgress({ stage }: { stage: Stage }) {
  const current = STAGES.indexOf(stage);
  return (
    <div className="doodle-card pop-in relative flex flex-col items-center gap-4 overflow-hidden p-6">
      <div className="relative">
        <span className="halo-ring text-primary/50" aria-hidden />
        <span className="halo-ring text-primary/35" style={{ animationDelay: "1.6s" }} aria-hidden />
        <div className="breathe">
          <Peitho expression="thinking" size={110} />
        </div>
      </div>
      <p className="hand text-lg">Peitho is reading it back to herself…</p>
      <ol className="ui-sans flex w-full flex-wrap items-center justify-center gap-2 text-sm">
        {STAGES.map((s, i) => (
          <li
            key={s}
            className={cn(
              "flex items-center gap-2 rounded-full border-2 px-3 py-1.5 font-medium transition-all duration-500",
              i < current && "border-primary bg-primary/10 text-primary",
              i === current && "shimmer breathe border-gold bg-gold/15 text-foreground",
              i > current && "border-border text-muted-foreground opacity-60",
            )}
          >
            <span
              className={cn(
                "size-2 rounded-full",
                i < current ? "bg-primary" : i === current ? "animate-pulse bg-gold" : "bg-border",
              )}
            />
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}

