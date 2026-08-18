import { useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { Peitho } from "./mascots";
import { StarfieldCanvas } from "./StarfieldCanvas";
import { CustomCursor } from "./CustomCursor";
import { BrandMark } from "./BrandMark";
import { Magnetic } from "./Magnetic";
import { play } from "@/lib/sound";
import { cn } from "@/lib/utils";

const SCENES = [
  {
    eyebrow: "Chapter one",
    lead: "You already know",
    punch: "what you mean",
    tail: ".",
    soft: "The hard part is making other people feel it.",
    expression: "idle" as const,
    tint: "oklch(0.62 0.16 300)",
  },
  {
    eyebrow: "How it works",
    lead: "Speak. We",
    punch: "listen closely",
    tail: ".",
    soft: "Seven dimensions, every rhetorical move, in under a minute.",
    expression: "thinking" as const,
    tint: "oklch(0.6 0.15 258)",
  },
  {
    eyebrow: "The curriculum",
    lead: "Craft is",
    punch: "learnable",
    tail: ".",
    soft: "Twenty-four lessons from Churchill, Lincoln and Noonan — one a day.",
    expression: "teaching" as const,
    tint: "oklch(0.66 0.16 200)",
  },
  {
    eyebrow: "Ready",
    lead: "Let us",
    punch: "begin",
    tail: ".",
    soft: "One honest answer today beats a perfect one next month.",
    expression: "celebrating" as const,
    tint: "oklch(0.74 0.16 58)",
  },
];

export function Onboarding({ onFinish }: { onFinish: () => void }) {
  const [i, setI] = useState(0);
  const scene = SCENES[i]!;
  const last = i === SCENES.length - 1;

  const advance = () => {
    play("tap");
    if (last) onFinish();
    else setI(i + 1);
  };

  return (
    <div className="night-stage" style={{ ["--scene-tint" as string]: scene.tint }}>
      <ClientOnly fallback={null}>
        <StarfieldCanvas />
      </ClientOnly>
      <ClientOnly fallback={null}>
        <CustomCursor />
      </ClientOnly>

      <span className="night-vignette" aria-hidden />
      <span className="scene-wash" aria-hidden />

      <div className="onb-frame">
        <header className="onb-top">
          <BrandMark glyphSize={34} />
          <span className="eyebrow onb-count">
            {String(i + 1).padStart(2, "0")} / {String(SCENES.length).padStart(2, "0")}
          </span>
        </header>

        <div key={i} className="onb-body">
          <div className="onb-copy">
            <p className="eyebrow rise rise-1">{scene.eyebrow}</p>
            <h1 className="display-xl rise rise-2 onb-headline">
              {scene.lead}{" "}
              <em className="onb-accent">{scene.punch}</em>
              {scene.tail}
            </h1>
            <p className="hero-soft rise rise-3 onb-soft">{scene.soft}</p>
          </div>

          <div className="onb-figure rise rise-2">
            <span className="halo-ring onb-halo" aria-hidden />
            <span className="halo-ring onb-halo" style={{ animationDelay: "1.7s" }} aria-hidden />
            <div className="breathe">
              <Peitho expression={scene.expression} size={210} />
            </div>
          </div>
        </div>

        <footer className="onb-bottom rise rise-4">
          <div className="onb-rail" aria-hidden>
            {SCENES.map((_, idx) => (
              <span
                key={idx}
                className={cn("onb-tick", idx === i && "onb-tick-on", idx < i && "onb-tick-past")}
              />
            ))}
          </div>

          <div className="onb-actions">
            {!last && (
              <button type="button" className="onb-skip" onClick={onFinish}>
                Skip
              </button>
            )}
            <Magnetic strength={0.28}>
              <button type="button" className="onb-cta tactile" onClick={advance}>
                {last ? "Start practising" : "Next"}
                <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
                  <path
                    d="M5 12h13m-5-5 5 5-5 5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </Magnetic>
          </div>
        </footer>
      </div>
    </div>
  );
}
