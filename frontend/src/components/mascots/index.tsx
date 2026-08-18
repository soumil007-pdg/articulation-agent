import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import peithoImg from "@/assets/mascot-peitho.png";
import calliopeImg from "@/assets/mascot-calliope.png";
import hermesImg from "@/assets/mascot-hermes.png";
import {
  ACCENT_GLOW,
  randomQuip,
  useMascotPrefs,
  type CompanionId,
} from "@/lib/mascot-prefs";

export type Expression = "idle" | "celebrating" | "thinking" | "concerned" | "teaching";

type MascotProps = {
  expression?: Expression;
  size?: number;
  className?: string;
  bob?: boolean;
  title?: string;
  eager?: boolean;
  /** Set false to opt a decorative instance out of tap reactions. */
  interactive?: boolean;
};

/** Expression is conveyed through motion/scale since the art is a fixed pose. */
const EXPRESSION_CLASS: Record<Expression, string> = {
  idle: "",
  celebrating: "mascot-cheer",
  thinking: "mascot-tilt",
  concerned: "mascot-shrink",
  teaching: "mascot-lean",
};

const ART: Record<CompanionId, { src: string; alt: string }> = {
  peitho: { src: peithoImg, alt: "Peitho, your warmth coach" },
  calliope: { src: calliopeImg, alt: "Calliope, your craft coach" },
  hermes: { src: hermesImg, alt: "Hermes, your delivery coach" },
};

function Accessory({ kind, size }: { kind: string; size: number }) {
  if (kind === "none") return null;
  const s = size * 0.34;
  const common = "pointer-events-none absolute select-none";
  if (kind === "sparkles") {
    return (
      <svg
        aria-hidden
        className={cn(common, "mascot-sparkles inset-0 h-full w-full")}
        viewBox="0 0 100 100"
        fill="none"
      >
        {([
          [14, 24, 5],
          [84, 34, 4],
          [70, 12, 3],
          [24, 78, 3.4],
        ] as const).map(([cx, cy, r], i) => (
          <path
            key={i}
            d={`M${cx} ${cy - r} L${cx + r * 0.34} ${cy - r * 0.34} L${cx + r} ${cy} L${cx + r * 0.34} ${cy + r * 0.34} L${cx} ${cy + r} L${cx - r * 0.34} ${cy + r * 0.34} L${cx - r} ${cy} L${cx - r * 0.34} ${cy - r * 0.34} Z`}
            className="fill-gold"
            style={{ animationDelay: `${i * 0.4}s` }}
          />
        ))}
      </svg>
    );
  }
  if (kind === "halo") {
    return (
      <span
        aria-hidden
        className={cn(common, "mascot-halo left-1/2 -translate-x-1/2 rounded-[50%] border-2 border-gold")}
        style={{ width: s * 1.5, height: s * 0.42, top: -s * 0.28 }}
      />
    );
  }
  return (
    <svg
      aria-hidden
      className={cn(common, "left-1/2 -translate-x-1/2")}
      style={{ width: s, height: s * 0.7, top: -s * 0.45 }}
      viewBox="0 0 40 28"
    >
      <path
        d="M3 25 L6 6 L14 15 L20 3 L26 15 L34 6 L37 25 Z"
        className="fill-gold stroke-foreground/25"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Mascot({
  who,
  expression = "idle",
  size = 120,
  className,
  bob,
  eager,
  title,
  interactive = true,
}: MascotProps & { who: CompanionId }) {
  const { prefs } = useMascotPrefs();
  const [reacting, setReacting] = useState(false);
  const [quip, setQuip] = useState<string | null>(null);
  const timers = useRef<number[]>([]);

  const react = useCallback(() => {
    if (!interactive || prefs.motion === "still") return;
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setReacting(true);
    timers.current.push(window.setTimeout(() => setReacting(false), 700));
    if (prefs.reactions) {
      setQuip(randomQuip(who));
      timers.current.push(window.setTimeout(() => setQuip(null), 2200));
    }
  }, [interactive, prefs.motion, prefs.reactions, who]);

  const idleClass =
    prefs.motion === "still"
      ? ""
      : prefs.motion === "lively"
        ? "mascot-idle mascot-idle-lively"
        : "mascot-idle";

  const art = ART[who];

  // Pointer parallax: the character leans toward the cursor in 3D.
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const onMove = useCallback(
    (e: React.PointerEvent<HTMLSpanElement>) => {
      if (prefs.motion === "still") return;
      const r = e.currentTarget.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      setTilt({ x: Math.max(-1, Math.min(1, dx)), y: Math.max(-1, Math.min(1, dy)) });
    },
    [prefs.motion],
  );
  const onLeave = useCallback(() => setTilt({ x: 0, y: 0 }), []);

  return (
    <span
      className={cn("mascot-slot relative inline-flex select-none", interactive && "cursor-pointer")}
      style={{ width: size, height: size }}
      onPointerDown={react}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      onKeyDown={(e) => {
        if (interactive && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          react();
        }
      }}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : -1}
      aria-label={interactive ? `${title ?? art.alt} — tap for a nudge` : undefined}
    >
      <span aria-hidden className="mascot-starlight" />
      {prefs.accent !== "none" && (
        <span
          aria-hidden
          className="mascot-aura absolute inset-0 rounded-full"
          style={{ background: `radial-gradient(circle, ${ACCENT_GLOW[prefs.accent]}, transparent 68%)` }}
        />
      )}
      <img
        src={art.src}
        alt={title ?? art.alt}
        width={size}
        height={size}
        loading={eager ? "eager" : "lazy"}
        draggable={false}
        style={{
          width: size,
          height: size,
          transform: `perspective(600px) rotateY(${tilt.x * 9}deg) rotateX(${-tilt.y * 9}deg) translateZ(0)`,
        }}
        className={cn(
          "mascot-art relative object-contain transition-transform duration-300 ease-out",
          bob !== false && prefs.motion !== "still" && "mascot-bob",
          idleClass,
          reacting && "mascot-poke",
          interactive && "hover:-translate-y-1 hover:rotate-[-3deg]",
          EXPRESSION_CLASS[expression],
          className,
        )}
      />
      <Accessory kind={prefs.accessory} size={size} />
      {quip && (
        <span className="mascot-quip ui-sans absolute -top-2 left-full z-20 ml-1 w-max max-w-[11rem] -translate-y-1/2 rounded-2xl bg-card px-3 py-1.5 text-xs font-bold text-card-foreground shadow-lg">
          {quip}
        </span>
      )}
    </span>
  );
}

/** Peitho — warmth & persuasion. */
export function Peitho(props: MascotProps) {
  return <Mascot who="peitho" {...props} />;
}

/** Calliope — craft, lessons, the long game. */
export function Calliope(props: MascotProps) {
  return <Mascot who="calliope" {...props} />;
}

/** Hermes — speed, delivery, rehearsal scenarios. */
export function Hermes(props: MascotProps) {
  return <Mascot who="hermes" {...props} />;
}

/** The companion the user picked in You → Your companion. */
export function Companion(props: MascotProps) {
  const { prefs } = useMascotPrefs();
  return <Mascot who={prefs.companion} {...props} />;
}
