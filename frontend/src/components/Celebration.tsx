import { createPortal } from "react-dom";
import { Peitho } from "./mascots";
import { Button } from "@/components/ui/button";

export function Celebration({
  score,
  streak,
  onContinue,
}: {
  score: number;
  streak: number;
  onContinue: () => void;
}) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm">
      <div className="pop-in hero-surface hero-living hero-crimson relative flex max-h-full w-full max-w-2xl flex-col items-center gap-6 overflow-hidden rounded-4xl px-8 py-12 text-center">
        <span className="sun-rays text-gold" aria-hidden />
        <span
          className="bloom size-80 bg-gold/30"
          style={{ top: "-6rem", left: "50%", marginLeft: "-10rem" }}
          aria-hidden
        />

        <div className="rise rise-1 relative">
          <span className="halo-ring text-gold/70" aria-hidden />
          <span className="halo-ring text-gold/50" style={{ animationDelay: "1.5s" }} aria-hidden />
          <Peitho expression="celebrating" size={160} />
        </div>
        <h2 className="rise rise-2 relative text-4xl sm:text-5xl">
          You scored <span className="highlighter">{Math.round(score)}</span>
        </h2>
        <p className="rise rise-3 hero-soft relative max-w-md text-xl">
          Every rep moves the needle. That's {streak} {streak === 1 ? "day" : "days"} in a row.
        </p>
        <div className="rise rise-4 breathe relative flex items-center gap-3 rounded-full bg-white/12 px-5 py-2.5 text-lg font-bold">
          <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
            <path
              d="M13 2c1 4-3 5-3 9a3 3 0 0 0 6 0c2 2 3 4 3 6a7 7 0 0 1-14 0c0-6 6-8 8-15z"
              fill="var(--gold)"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>{" "}
          {streak}-day streak
        </div>
        <Button
          size="lg"
          className="rise rise-5 tactile relative rounded-full bg-gold px-8 text-gold-foreground shadow-lg hover:bg-gold/90"
          onClick={onContinue}
        >
          See my breakdown
        </Button>
      </div>
    </div>,
    document.body,
  );
}

