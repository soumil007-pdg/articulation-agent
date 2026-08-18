import { useCallback, useEffect, useRef, useState } from "react";

const KEY = "articulate.intro.seen";
const DURATION = 1900;

/**
 * Cinematic opener: ink wash, a constellation draws itself into the mark,
 * the wordmark sets one letter at a time, then the curtain lifts into the app.
 * Plays once per browser session, skippable with click / Esc / any key.
 */
export function CinematicIntro() {
  const [phase, setPhase] = useState<"hidden" | "playing" | "leaving">("hidden");
  const timers = useRef<number[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = false;
    try {
      seen = sessionStorage.getItem(KEY) === "1";
    } catch {
      seen = false;
    }
    if (seen || reduced) return;
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {
      /* private mode — just play it */
    }
    setPhase("playing");
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, []);

  const finish = useCallback(() => {
    setPhase((p) => (p === "playing" ? "leaving" : p));
  }, []);

  useEffect(() => {
    if (phase !== "playing") return;
    timers.current.push(window.setTimeout(finish, DURATION));
    const onKey = () => finish();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, [phase, finish]);

  useEffect(() => {
    if (phase !== "leaving") return;
    const t = window.setTimeout(() => {
      setPhase("hidden");
      document.documentElement.style.overflow = "";
    }, 620);
    return () => clearTimeout(t);
  }, [phase]);

  if (phase === "hidden") return null;

  const word = "ARTICULATE";

  return (
    <div
      role="presentation"
      onClick={finish}
      className={`intro-root ${phase === "leaving" ? "intro-leaving" : ""}`}
    >
      <div className="intro-ink" aria-hidden />
      <div className="intro-vignette" aria-hidden />

      <div className="relative flex flex-col items-center gap-8 px-6 text-center">
        <svg viewBox="0 0 200 200" className="intro-mark size-28 sm:size-36" aria-hidden>
          <g className="intro-constellation">
            <path d="M46 120 L70 62 L118 48 L156 86 L138 140 L84 152 Z" />
            <path d="M70 62 L138 140" />
            <path d="M118 48 L84 152" />
          </g>
          {[
            [46, 120],
            [70, 62],
            [118, 48],
            [156, 86],
            [138, 140],
            [84, 152],
          ].map(([cx, cy], i) => (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r="4.5"
              className="intro-star"
              style={{ animationDelay: `${320 + i * 55}ms` }}
            />
          ))}
          <circle cx="100" cy="100" r="13" className="intro-core" />
        </svg>

        <h1 className="intro-word display-xl">
          {word.split("").map((ch, i) => (
            <span key={i} style={{ animationDelay: `${450 + i * 34}ms` }}>
              {ch}
            </span>
          ))}
        </h1>

        <p className="intro-tag">Say the thing that lands.</p>
      </div>

      <button
        type="button"
        onClick={finish}
        className="intro-skip"
        aria-label="Skip the intro"
      >
        Skip
      </button>

      <div className="intro-curtain intro-curtain-top" aria-hidden />
      <div className="intro-curtain intro-curtain-bottom" aria-hidden />
    </div>
  );
}
