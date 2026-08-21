import { useState } from "react";
import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Companion } from "@/components/mascots";
import { MascotStudio } from "@/components/MascotStudio";
import { HealthIndicator } from "@/components/HealthIndicator";
import { ResultsView } from "@/components/ResultsView";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DEFAULT_API_BASE, getApiBase, setApiBase } from "@/lib/api";
import { printAllSessions } from "@/lib/report";
import { clearSessions, useProfile, useSessions, type Session } from "@/lib/storage";

export const Route = createFileRoute("/you")({
  head: () => ({
    meta: [
      { title: "You — profile, backend & history | Articulate AI" },
      {
        name: "description",
        content:
          "Set your name, theme and default practice mode, check the coaching backend connection, and review or export your session history.",
      },
      { property: "og:title", content: "You — profile, backend & history" },
      {
        property: "og:description",
        content: "Profile settings, backend connection status, and your full local session history.",
      },
    ],
  }),
  component: YouPage,
});

function YouInner() {
  const { profile, update } = useProfile();
  const sessions = useSessions();
  const [base, setBase] = useState(getApiBase());
  const [open, setOpen] = useState<Session | null>(null);

  const exportPdf = () => {
    if (sessions.length === 0) {
      toast.error("No sessions to export yet");
      return;
    }
    printAllSessions(sessions, profile.name || undefined);
  };

  /** Raw JSON stays available as a portable backup of the underlying data. */
  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ profile, sessions }, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "articulate-data.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell>
      <header className="doodle-card mb-6 flex flex-col items-center gap-5 p-6 sm:flex-row">
        <Companion expression="idle" size={120} />
        <div>
          <h1 className="display-lg vt-hero">You</h1>
          <p className="hand text-lg text-muted-foreground">
            {profile.name ? `Good to see you, ${profile.name}.` : "Tell me who I'm coaching."}
          </p>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        <MascotStudio />
        <section className="doodle-card ui-sans space-y-4 p-5">
          <h2 className="font-display text-xl">Profile</h2>
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={profile.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={profile.email}
              onChange={(e) => update({ email: e.target.value })}
              placeholder="you@example.com"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="theme">Dark theme</Label>
            <Switch
              id="theme"
              checked={profile.theme === "dark"}
              onCheckedChange={(v) => update({ theme: v ? "dark" : "light" })}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="mode">Default to audio mode</Label>
            <Switch
              id="mode"
              checked={profile.defaultMode === "audio"}
              onCheckedChange={(v) => update({ defaultMode: v ? "audio" : "text" })}
            />
          </div>
          <Button variant="outline" onClick={() => update({ onboarded: false })}>
            Replay the intro
          </Button>
        </section>

        <section className="doodle-card ui-sans space-y-4 p-5">
          <h2 className="font-display text-xl">Coaching backend</h2>
          <HealthIndicator />
          <div className="space-y-1.5">
            <Label htmlFor="base">API base URL</Label>
            <Input id="base" value={base} onChange={(e) => setBase(e.target.value)} />
            <p className="text-xs text-muted-foreground">Default: {DEFAULT_API_BASE}</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setApiBase(base);
                toast.success("Backend URL saved");
                window.location.reload();
              }}
            >
              Save
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setApiBase("");
                setBase(DEFAULT_API_BASE);
                toast.success("Reset to default");
                window.location.reload();
              }}
            >
              Reset
            </Button>
          </div>
        </section>

        <section className="doodle-card ui-sans space-y-3 p-5 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl">Session history</h2>
            <div className="flex gap-2">
              <Button onClick={exportPdf}>Export PDF</Button>
              <Button variant="outline" onClick={exportJson}>
                Backup (.json)
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  clearSessions();
                  toast.success("History cleared");
                }}
              >
                Reset history
              </Button>
            </div>
          </div>
          {sessions.length === 0 ? (
            <p className="hand text-lg text-muted-foreground">Nothing here yet.</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Tap any session to reopen the full coaching report.
              </p>
              <ul className="divide-y-2 divide-border">
                {sessions.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setOpen(s)}
                      className="tactile flex w-full items-center justify-between gap-4 rounded-xl px-2 py-3 text-left hover:bg-accent"
                    >
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{s.prompt}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(s.date).toLocaleString()} · {s.goal} · {s.audience} · {s.mode}
                        </div>
                      </div>
                      <div className="text-xl font-extrabold">
                        {Math.round(s.scoring?.overallScore ?? 0)}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      <Dialog open={open !== null} onOpenChange={(v) => !v && setOpen(null)}>
        <DialogContent className="max-h-[88vh] max-w-4xl overflow-y-auto">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle className="text-left">{open.prompt}</DialogTitle>
                <DialogDescription className="text-left">
                  {new Date(open.date).toLocaleString()} · {open.goal} · {open.audience} ·{" "}
                  {open.mode}
                </DialogDescription>
              </DialogHeader>
              {/* On a fresh run your words are still in the textarea above; when
                  reopening history they're gone, so show them with the feedback. */}
              <section className="doodle-card p-5">
                <h3 className="ui-sans mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {open.mode === "audio" ? "What you said" : "What you wrote"}
                </h3>
                <p className="whitespace-pre-wrap text-base leading-relaxed">{open.response}</p>
              </section>
              <ResultsView
                scoring={open.scoring}
                rhetoric={open.rhetoric}
                noonan={open.noonan}
                response={open.response}
                speech={open.speech}
                session={open}
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function YouPage() {
  return (
    <ClientOnly fallback={<AppShell><div className="h-96" /></AppShell>}>
      <YouInner />
    </ClientOnly>
  );
}
