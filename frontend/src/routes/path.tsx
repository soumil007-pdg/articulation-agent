import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check } from "lucide-react";

/**
 * Scroll-linked trail: as a chapter scrolls through the viewport its dashed
 * rail fills, a comet rides the fill, and the milestone cards drift a few
 * pixels against the scroll for depth.
 */
function useTrailProgress<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.setProperty("--trail-progress", "1");
      return;
    }

    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const p = Math.min(1, Math.max(0, (vh * 0.82 - r.top) / Math.max(1, r.height)));
      el.style.setProperty("--trail-progress", p.toFixed(4));
      el.style.setProperty("--trail-shift", ((p - 0.5) * 26).toFixed(2));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return ref;
}


import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Calliope } from "@/components/mascots";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FAMILY_LABEL, LESSONS, type Lesson, type LessonFamily } from "@/lib/curriculum";
import { familyColor } from "@/lib/analysis";
import { queuePractice } from "@/lib/practice-bus";
import { usePathProgress } from "@/lib/path-progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/path")({
  head: () => ({
    meta: [
      { title: "The Path — 24 rhetoric lessons | Articulate AI" },
      {
        name: "description",
        content:
          "A guided route-map through 24 rhetoric lessons in three families — repetition, structure and drama — plus core speaking principles.",
      },
      { property: "og:title", content: "The Path — 24 rhetoric lessons" },
      {
        property: "og:description",
        content: "Definition, master example, and a drill for every device, guided by Calliope.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PathPage,
});

const ORDER: LessonFamily[] = ["repetition", "structure", "drama", "principles"];

const CHAPTER_NOTE: Record<LessonFamily, string> = {
  repetition: "Make an idea land by letting it return.",
  structure: "Shape the sentence and the sentence shapes the thought.",
  drama: "Turn a point into a moment people can feel.",
  principles: "The habits underneath every speech worth hearing.",
};

function ProgressRing({ value, size = 88 }: { value: number; size?: number }) {
  const r = size / 2 - 6;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="7"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--gold)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - value)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)" }}
      />
      <text
        x="50%"
        y="53%"
        textAnchor="middle"
        dominantBaseline="middle"
        fill="currentColor"
        fontSize={size * 0.26}
        fontWeight="800"
      >
        {Math.round(value * 100)}%
      </text>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-7">
      <path
        d="m5 13 4.5 4.5L19 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6">
      <rect x="5" y="10" width="14" height="10" rx="3" fill="currentColor" opacity="0.9" />
      <path
        d="M8.5 10V7.5a3.5 3.5 0 1 1 7 0V10"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

type NodeState = "done" | "current" | "locked";

function Trail({ color, children }: { color: string; children: ReactNode }) {
  const ref = useTrailProgress<HTMLDivElement>();
  return (
    <div ref={ref} className="relative mt-8 pl-7 md:pl-0" style={{ color }}>
      <span
        className="trail-rail left-[26px] md:left-1/2 md:-translate-x-1/2"
        aria-hidden
      />
      <span className="trail-comet left-[27px] md:left-1/2" aria-hidden />
      {children}
    </div>
  );
}

function Milestone({
  lesson,
  index,
  side,
  color,
  state,
  onOpen,
}: {
  lesson: Lesson;
  index: number;
  side: "left" | "right";
  color: string;
  state: NodeState;
  onOpen: () => void;
}) {
  return (
    <li
      className={cn(
        "relative flex items-center gap-4 md:gap-0",
        side === "left" ? "md:flex-row" : "md:flex-row-reverse",
      )}
    >
      {/* label card */}
      <div
        className={cn(
          "order-2 flex-1 md:order-none",
          side === "left" ? "trail-parallax" : "trail-parallax-rev",
          side === "left" ? "md:pr-14 md:text-right" : "md:pl-14 md:text-left",
        )}
      >
        <button
          type="button"
          onClick={onOpen}
          className={cn(
            "doodle-soft tactile w-full p-4 text-left md:inline-block md:w-auto md:max-w-sm",
            side === "left" && "md:text-right",
            state === "locked" && "opacity-60",
          )}
          style={state !== "locked" ? { borderColor: `${color}66` } : undefined}
        >
          <span
            className="ui-sans text-[11px] font-extrabold uppercase tracking-widest"
            style={{ color }}
          >
            Step {index + 1}
          </span>
          <span className="block text-lg leading-tight">{lesson.name}</span>
          <span className="hand block text-sm text-muted-foreground">{lesson.definition}</span>
        </button>
      </div>

      {/* node on the trail */}
      <div className="relative z-10 order-1 shrink-0 md:order-none md:absolute md:left-1/2 md:-translate-x-1/2">
        {state === "current" && (
          <>
            <span className="halo-ring" style={{ color }} aria-hidden />
            <span
              className="halo-ring"
              style={{ color, animationDelay: "1.6s" }}
              aria-hidden
            />
          </>
        )}
        <button
          type="button"
          onClick={onOpen}
          aria-label={lesson.name}
          className={cn(
            "tactile flex size-14 items-center justify-center rounded-full border-[3px] border-background text-lg font-extrabold shadow-md",
            state === "current" && "breathe",
          )}
          style={{
            backgroundColor: state === "locked" ? "var(--muted)" : color,
            color: state === "locked" ? "var(--muted-foreground)" : "#fff",
          }}
        >
          {state === "done" ? <CheckIcon /> : state === "locked" ? <LockIcon /> : index + 1}
        </button>
      </div>

      {/* spacer for the opposite column */}
      <div className="hidden flex-1 md:block" />
    </li>
  );
}

function PathPage() {
  const navigate = useNavigate();
  const { completed, toggle } = usePathProgress();
  const [open, setOpen] = useState<Lesson | null>(null);

  const done = new Set(completed);
  const pct = LESSONS.length ? done.size / LESSONS.length : 0;
  const firstOpenId = LESSONS.find((l) => !done.has(l.id))?.id;

  const stateOf = (l: Lesson): NodeState =>
    done.has(l.id) ? "done" : l.id === firstOpenId ? "current" : "locked";

  const openColor = open ? familyColor(open.family) : undefined;

  return (
    <AppShell>
      {/* chapter-book hero */}
      <header className="hero-surface hero-living hero-cobalt relative mb-10 overflow-hidden rounded-4xl px-6 py-10 sm:px-10">
        <span
          className="bloom size-72 bg-gold/25"
          style={{ top: "-5rem", right: "-3rem" }}
          aria-hidden
        />
        <div className="relative flex flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
          <div className="rise rise-1 relative">
            <span className="halo-ring text-gold/60" aria-hidden />
            <div className="breathe">
              <Calliope expression="teaching" size={140} />
            </div>
          </div>
          <div className="rise rise-2 flex-1">
            <p className="ui-sans text-xs font-extrabold uppercase tracking-[0.2em] opacity-80">
              Your journey
            </p>
            <h1 className="display-lg vt-hero">The Path</h1>
            <p className="hero-soft mt-1 text-lg opacity-90">
              Twenty-four lessons. One device at a time, until they're yours.
            </p>
          </div>
          <div className="rise rise-3 flex flex-col items-center gap-1">
            <ProgressRing value={pct} />
            <span className="ui-sans text-xs opacity-80">
              {done.size} of {LESSONS.length} done
            </span>
          </div>
        </div>
      </header>

      <div className="space-y-14">
        {ORDER.map((family, chapter) => {
          const color = familyColor(family);
          const lessons = LESSONS.filter((l) => l.family === family);
          const chapterDone = lessons.filter((l) => done.has(l.id)).length;

          return (
            <section key={family} className="rise rise-2 relative">
              {/* chapter band */}
              <div
                className="relative overflow-hidden rounded-3xl px-6 py-5 text-center"
                style={{
                  background: `linear-gradient(135deg, ${color}, ${color}99)`,
                  color: "#fff",
                }}
              >
                <p className="ui-sans text-[11px] font-extrabold uppercase tracking-[0.25em] opacity-85">
                  Chapter {chapter + 1}
                </p>
                <h2 className="display-md">{FAMILY_LABEL[family]}</h2>
                <p className="hero-soft text-base opacity-95">{CHAPTER_NOTE[family]}</p>
                <p className="ui-sans mt-2 text-xs font-bold opacity-90">
                  {chapterDone} / {lessons.length} complete
                </p>
              </div>

              {/* winding, scroll-linked trail */}
              <Trail color={color}>
                <ol className="relative space-y-8 md:space-y-12">

                  {lessons.map((lesson, i) => (
                    <Milestone
                      key={lesson.id}
                      lesson={lesson}
                      index={i}
                      side={i % 2 === 0 ? "left" : "right"}
                      color={color}
                      state={stateOf(lesson)}
                      onOpen={() => setOpen(lesson)}
                    />
                  ))}
                </ol>
              </Trail>
            </section>
          );
        })}
      </div>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="doodle-card max-w-lg gap-0 overflow-hidden p-0 sm:rounded-4xl">
          {open && (
            <>
              <div
                className="relative overflow-hidden px-6 py-7 text-center"
                style={{
                  background: `linear-gradient(135deg, ${openColor}, ${openColor}99)`,
                  color: "#fff",
                }}
              >
                <span className="sun-rays" style={{ color: "#fff" }} aria-hidden />
                <DialogHeader className="relative items-center">
                  <p className="ui-sans text-[11px] font-extrabold uppercase tracking-[0.25em] opacity-85">
                    {FAMILY_LABEL[open.family]}
                  </p>
                  <DialogTitle className="display-md">{open.name}</DialogTitle>
                  <span
                    className={cn(
                      "ui-sans mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em]",
                      done.has(open.id) ? "bg-white/95 text-foreground" : "bg-white/20 text-white",
                    )}
                  >
                    <Check className={cn("size-3.5", !done.has(open.id) && "opacity-60")} />
                    {done.has(open.id) ? "Completed" : "Not yet completed"}
                  </span>
                </DialogHeader>
              </div>

              <div className="space-y-5 p-6">
                <section className="space-y-1.5">
                  <p className="ui-sans text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted-foreground">
                    Definition
                  </p>
                  <DialogDescription className="text-base leading-relaxed text-foreground">
                    {open.definition}
                  </DialogDescription>
                </section>

                <section className="space-y-1.5">
                  <p className="ui-sans text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted-foreground">
                    Master example
                  </p>
                  <div className="sticky-note p-4">
                    <p className="hand text-lg leading-snug">“{open.example}”</p>
                    <p className="ui-sans mt-1 text-xs text-muted-foreground">
                      — {open.attribution}
                    </p>
                  </div>
                </section>

                <div className="dotted-divider" />

                <section className="space-y-1.5">
                  <p className="ui-sans text-[11px] font-extrabold uppercase tracking-[0.22em] text-muted-foreground">
                    Your drill
                  </p>
                  <p className="ui-sans text-sm leading-relaxed text-foreground/80">
                    {open.drillPrompt}
                  </p>
                </section>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    size="lg"
                    className="tactile ui-sans flex-1 rounded-full font-bold"
                    onClick={() => {
                      queuePractice({ prompt: open.drillPrompt, label: open.name });
                      navigate({ to: "/practice" });
                    }}
                  >
                    Drill this
                  </Button>
                  <Button
                    size="lg"
                    variant={done.has(open.id) ? "secondary" : "outline"}
                    className="tactile ui-sans flex-1 rounded-full font-bold"
                    onClick={() => toggle(open.id)}
                  >
                    {done.has(open.id) ? "Mark as not done" : "Mark complete"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

    </AppShell>
  );
}
