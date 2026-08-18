/**
 * Persuasion Triangle — ternary plot of ethos/pathos/logos against the
 * 65% pathos / 25% logos / 10% ethos benchmark for emotionally resonant speech.
 */

const BENCHMARK = { pathos: 65, logos: 25, ethos: 10 };

const W = 320;
const H = 285;
const PAD = 30;

// vertices: pathos top, ethos bottom-left, logos bottom-right
const V = {
  pathos: [W / 2, PAD],
  ethos: [PAD, H - PAD],
  logos: [W - PAD, H - PAD],
} as const;

function toXY(p: { ethos: number; pathos: number; logos: number }) {
  const total = Math.max(1, p.ethos + p.pathos + p.logos);
  const a = p.pathos / total;
  const b = p.ethos / total;
  const c = p.logos / total;
  return [
    a * V.pathos[0] + b * V.ethos[0] + c * V.logos[0],
    a * V.pathos[1] + b * V.ethos[1] + c * V.logos[1],
  ] as const;
}

export function PersuasionTriangle({
  value,
  advice,
}: {
  value: { ethos: number; pathos: number; logos: number };
  advice?: string;
}) {
  const you = toXY(value);
  const ideal = toXY(BENCHMARK);
  const tri = `${V.pathos.join(",")} ${V.ethos.join(",")} ${V.logos.join(",")}`;

  return (
    <div className="doodle-card p-5">
      <h3 className="text-xl">Persuasion Triangle</h3>
      <p className="hand text-sm text-muted-foreground">
        Aristotle's three appeals, plotted against the resonance benchmark.
      </p>

      <div className="mt-3 flex flex-col items-center gap-4 sm:flex-row">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-w-[340px]" role="img" aria-label="Persuasion triangle">
          <polygon
            points={tri}
            fill="var(--mint)"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
          {[0.25, 0.5, 0.75].map((t) => (
            <polygon
              key={t}
              points={[V.pathos, V.ethos, V.logos]
                .map(([x, y]) => [
                  W / 2 + (x - W / 2) * t,
                  (PAD + ((H - PAD) * 2) / 3) * (1 - t) + y * t,
                ])
                .map((p) => p.join(","))
                .join(" ")}
              fill="none"
              stroke="currentColor"
              strokeWidth={1}
              strokeDasharray="3 5"
              opacity={0.3}
            />
          ))}

          {/* benchmark */}
          <circle cx={ideal[0]} cy={ideal[1]} r={9} fill="none" stroke="var(--gold)" strokeWidth={2.5} />
          <circle cx={ideal[0]} cy={ideal[1]} r={2.5} fill="var(--gold)" />

          {/* connector */}
          <line
            x1={ideal[0]}
            y1={ideal[1]}
            x2={you[0]}
            y2={you[1]}
            stroke="currentColor"
            strokeWidth={2}
            strokeDasharray="4 4"
            opacity={0.5}
          />

          {/* user */}
          <circle cx={you[0]} cy={you[1]} r={8} fill="var(--brand)" stroke="currentColor" strokeWidth={2.5} />

          <text x={V.pathos[0]} y={PAD - 10} textAnchor="middle" fontSize="13" fontWeight="700" fill="currentColor">
            Pathos {value.pathos}%
          </text>
          <text x={V.ethos[0] - 6} y={H - PAD + 18} textAnchor="start" fontSize="13" fontWeight="700" fill="currentColor">
            Ethos {value.ethos}%
          </text>
          <text x={V.logos[0] + 6} y={H - PAD + 18} textAnchor="end" fontSize="13" fontWeight="700" fill="currentColor">
            Logos {value.logos}%
          </text>
        </svg>

        <div className="ui-sans w-full space-y-3 text-sm sm:max-w-[16rem]">
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full bg-primary" /> You
          </div>
          <div className="flex items-center gap-2">
            <span className="size-3 rounded-full border-2 border-gold" /> Benchmark — 65 pathos / 25 logos / 10 ethos
          </div>
          {advice && <p className="text-muted-foreground">{advice}</p>}
        </div>
      </div>
    </div>
  );
}
