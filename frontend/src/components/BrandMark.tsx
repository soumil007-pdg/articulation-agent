import { cn } from "@/lib/utils";

/**
 * Articulate mark: a spoken arc rising out of an orbital ring, with an
 * ember star at the point where the words land. Celestial, not emerald —
 * it belongs to the night world.
 */
export function BrandGlyph({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={cn("brand-glyph", className)}
      role="img"
      aria-label="Articulate"
    >
      <defs>
        <linearGradient id="am-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="oklch(0.68 0.16 300)" />
          <stop offset="100%" stopColor="oklch(0.55 0.14 258)" />
        </linearGradient>
        <linearGradient id="am-arc" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="oklch(0.86 0.13 88)" />
          <stop offset="100%" stopColor="oklch(0.75 0.17 55)" />
        </linearGradient>
        <radialGradient id="am-core" cx="50%" cy="50%">
          <stop offset="0%" stopColor="oklch(0.99 0.05 90)" />
          <stop offset="100%" stopColor="oklch(0.78 0.17 58)" />
        </radialGradient>
      </defs>

      {/* orbital ring */}
      <circle
        cx="24"
        cy="24"
        r="19"
        fill="none"
        stroke="url(#am-ring)"
        strokeWidth="2"
        opacity="0.85"
      />
      <circle
        cx="24"
        cy="24"
        r="19"
        fill="none"
        stroke="oklch(0.86 0.13 88)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="10 109"
        className="brand-orbit"
        opacity="0.9"
      />

      {/* the utterance: a rising arc that resolves into a point */}
      <path
        d="M13 32c0-10 5.5-16 11.5-16 4.6 0 7.6 3 7.6 6.9 0 4.2-3.4 6.8-8.2 6.8H17l-4 4.6z"
        fill="none"
        stroke="url(#am-arc)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* ember star where it lands */}
      <path
        d="M33.6 12.8 35 17l4.2 1.4L35 19.8l-1.4 4.2-1.4-4.2L28 18.4l4.2-1.4z"
        fill="url(#am-core)"
      />
      <circle cx="24" cy="24" r="1.5" fill="oklch(0.92 0.08 88)" opacity="0.8" />
    </svg>
  );
}

export function BrandMark({
  className,
  glyphSize = 36,
  compact = false,
}: {
  className?: string;
  glyphSize?: number;
  compact?: boolean;
}) {
  return (
    <div className={cn("vt-brand flex items-center gap-3", className)}>
      <BrandGlyph size={glyphSize} />
      {!compact && (
        <div className="leading-none">
          <div className="brand-word">Articulate</div>
          <div className="brand-sub">say it better</div>
        </div>
      )}
    </div>
  );
}
