import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Companion } from "@/components/mascots";
import {
  ACCENT_SWATCH,
  COMPANION_LABEL,
  useMascotPrefs,
  type CompanionId,
  type MascotAccent,
  type MascotAccessory,
  type MascotMotion,
} from "@/lib/mascot-prefs";

const COMPANIONS: CompanionId[] = ["peitho", "calliope", "hermes"];
const ACCENTS: MascotAccent[] = ["none", "ember", "violet", "emerald", "rose"];
const ACCESSORIES: { id: MascotAccessory; label: string }[] = [
  { id: "none", label: "Bare" },
  { id: "sparkles", label: "Sparkles" },
  { id: "halo", label: "Halo" },
  { id: "crown", label: "Crown" },
];
const MOTIONS: { id: MascotMotion; label: string }[] = [
  { id: "still", label: "Still" },
  { id: "calm", label: "Calm" },
  { id: "lively", label: "Lively" },
];

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "tactile rounded-full border px-3.5 py-1.5 text-sm font-bold transition-colors",
        active
          ? "border-transparent bg-primary text-primary-foreground"
          : "border-border bg-muted/40 text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function MascotStudio() {
  const { prefs, update } = useMascotPrefs();

  return (
    <section className="doodle-card ui-sans space-y-5 p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl">Your companion</h2>
          <p className="text-sm text-muted-foreground">
            Tap the mascot anywhere in the app — it reacts.
          </p>
        </div>
        <Companion size={92} expression="idle" title="Preview of your companion" />
      </div>

      <div className="space-y-2">
        <Label className="text-[11px] uppercase tracking-[0.22em]">Coach</Label>
        <div className="flex flex-wrap gap-2">
          {COMPANIONS.map((id) => (
            <Chip key={id} active={prefs.companion === id} onClick={() => update({ companion: id })}>
              {COMPANION_LABEL[id]}
            </Chip>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-[11px] uppercase tracking-[0.22em]">Aura</Label>
        <div className="flex flex-wrap items-center gap-2">
          {ACCENTS.map((a) => (
            <button
              key={a}
              type="button"
              aria-label={`${a} aura`}
              onClick={() => update({ accent: a })}
              className={cn(
                "tactile size-9 rounded-full border-2 transition-transform",
                prefs.accent === a ? "border-primary scale-110" : "border-border",
                a === "none" && "bg-muted",
              )}
              style={a === "none" ? undefined : { background: ACCENT_SWATCH[a] }}
            />
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-[11px] uppercase tracking-[0.22em]">Accessory</Label>
        <div className="flex flex-wrap gap-2">
          {ACCESSORIES.map((a) => (
            <Chip key={a.id} active={prefs.accessory === a.id} onClick={() => update({ accessory: a.id })}>
              {a.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-[11px] uppercase tracking-[0.22em]">Idle motion</Label>
        <div className="flex flex-wrap gap-2">
          {MOTIONS.map((m) => (
            <Chip key={m.id} active={prefs.motion === m.id} onClick={() => update({ motion: m.id })}>
              {m.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="reactions">Speak up when tapped</Label>
        <Switch
          id="reactions"
          checked={prefs.reactions}
          onCheckedChange={(v) => update({ reactions: v })}
        />
      </div>
    </section>
  );
}
