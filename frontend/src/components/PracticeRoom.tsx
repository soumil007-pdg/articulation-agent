import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "./AppShell";
import { Celebration } from "./Celebration";
import { Magnetic } from "./Magnetic";
import { AnalysisProgress, type Stage } from "./AnalysisProgress";
import { ResultsView } from "./ResultsView";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AUDIENCES,
  GOALS,
  buildCraftPlan,
  scoreResponse,
  type Audience,
  type CraftResult,
  type GoalId,
  type RhetoricResult,
  type ScoringResult,
} from "@/lib/analysis";
import { uploadAudio } from "@/lib/api";
import { noonanCheck, type NoonanResult } from "@/lib/noonan";
import { computeStreak, saveSession, useProfile, useSessions, type Session } from "@/lib/storage";
import { takePractice } from "@/lib/practice-bus";
import { cn } from "@/lib/utils";

const QUICK_TOPICS = [
  "Tell me about yourself",
  "Talk about a hobby",
  "How was your day?",
  "Explain your work to a stranger",
];

export function PracticeRoom() {
  const { profile, ready } = useProfile();
  const sessions = useSessions();

  const [mode, setMode] = useState<"text" | "audio">("text");
  const [goal, setGoal] = useState<GoalId>("professional-update");
  const [audience, setAudience] = useState<Audience>("General");
  const [prompt, setPrompt] = useState(QUICK_TOPICS[0]!);
  const [response, setResponse] = useState("");
  const [stage, setStage] = useState<Stage | null>(null);
  const [scoring, setScoring] = useState<ScoringResult | null>(null);
  const [rhetoric, setRhetoric] = useState<RhetoricResult | null>(null);
  const [noonan, setNoonan] = useState<NoonanResult | null>(null);
  const [craft, setCraft] = useState<CraftResult | null>(null);
  const [speech, setSpeech] = useState<Record<string, unknown> | null>(null);
  const [lastSession, setLastSession] = useState<Session | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ready) return;
    setMode(profile.defaultMode);
    const pending = takePractice();
    if (pending) {
      setPrompt(pending.prompt);
      if (pending.goal) setGoal(pending.goal);
      if (pending.audience) setAudience(pending.audience);
      toast.success(pending.label ? `Loaded: ${pending.label}` : "Practice prompt loaded");
    }
  }, [ready, profile.defaultMode]);

  const streak = computeStreak(sessions);
  const liveNoonan = useMemo(() => (response.trim() ? noonanCheck(response) : null), [response]);
  const goalLabel = GOALS.find((g) => g.id === goal)?.label ?? goal;

  async function runAnalysis(
    text: string,
    usedMode: "text" | "audio",
    speechData?: Record<string, unknown> | null,
  ) {
    try {
      const local = noonanCheck(text);
      setNoonan(local);

      setStage("Scoring");
      const scored = await scoreResponse({
        goal: goalLabel,
        audience,
        prompt,
        response: text,
        mode: usedMode,
        speech: speechData ?? null,
      });
      setScoring(scored);

      // Rhetoric and craft share one call — see CRAFT_SCHEMA on why splitting
      // them blew past Groq's per-minute token budget.
      setStage("Craft plan");
      let craft: CraftResult | null = null;
      let rhet: RhetoricResult | null = null;
      try {
        const bundle = await buildCraftPlan({
          goal: goalLabel,
          audience,
          prompt,
          response: text,
          mode: usedMode,
          scoring: scored,
          avoidWords: local.flabbyWords,
        });
        rhet = bundle.rhetoric ?? null;
        craft = {
          vocabulary: bundle.vocabulary,
          restructure: bundle.restructure,
          exercises: bundle.exercises,
        };
      } catch {
        toast.message("Craft plan unavailable for this run");
      }
      setRhetoric(rhet);
      setCraft(craft);

      const saved: Session = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        goal: goalLabel,
        audience,
        prompt,
        response: text,
        mode: usedMode,
        scoring: scored,
        rhetoric: rhet,
        noonan: local,
        craft,
        speech: speechData ?? null,
      };
      saveSession(saved);
      setLastSession(saved);
      setStage(null);
      setCelebrating(true);
    } catch (err) {
      setStage(null);
      toast.error(
        err instanceof Error
          ? `${err.message}. Check the backend connection in You.`
          : "Analysis failed",
      );
    }
  }

  async function submitText() {
    if (response.trim().length < 15) {
      toast.error("Give me a few more words to work with");
      return;
    }
    setScoring(null);
    setRhetoric(null);
    setCraft(null);
    setSpeech(null);
    await runAnalysis(response.trim(), "text");
  }

  async function toggleRecording() {
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: "audio/webm" });
        setStage("Scoring");
        try {
          const result = await uploadAudio(blob, `${prompt} — ${audience}`);
          const text = String(result.transcript ?? result.transcription ?? result.text ?? "");
          if (!text.trim()) throw new Error("No transcription returned");
          setResponse(text);
          setSpeech(result as Record<string, unknown>);
          await runAnalysis(text, "audio", result as Record<string, unknown>);
        } catch (err) {
          setStage(null);
          toast.error(err instanceof Error ? err.message : "Transcription failed");
        }
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      toast.error("Microphone access denied");
    }
  }

  return (
    <AppShell>
      {celebrating && scoring && (
        <Celebration
          score={scoring.overallScore ?? 0}
          streak={Math.max(streak, 1)}
          onContinue={() => {
            setCelebrating(false);
            setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
          }}
        />
      )}

      <div className="mx-auto w-full max-w-3xl">
        <div className="rise rise-1 flex flex-wrap items-center justify-between gap-3">
          <p className="eyebrow text-muted-foreground">The room · one honest answer</p>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="tactile ui-sans rounded-full font-bold">
                {goalLabel} · {audience}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="ui-sans w-72 space-y-3 rounded-3xl">
              <div>
                <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
                  Goal
                </label>
                <Select value={goal} onValueChange={(v) => setGoal(v as GoalId)}>
                  <SelectTrigger className="rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GOALS.map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[0.16em] text-muted-foreground">
                  Audience
                </label>
                <Select value={audience} onValueChange={(v) => setAudience(v as Audience)}>
                  <SelectTrigger className="rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AUDIENCES.map((a) => (
                      <SelectItem key={a} value={a}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        <h1 className="display-lg vt-hero rise rise-2 mt-4 text-balance">“{prompt}”</h1>

        <div className="rise rise-3 mt-5 flex flex-wrap gap-2">
          {QUICK_TOPICS.map((t) => (
            <button
              key={t}
              onClick={() => setPrompt(t)}
              className={cn(
                "tactile ui-sans rounded-full border-2 px-3.5 py-1.5 text-sm font-bold transition-colors",
                prompt === t
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border hover:bg-secondary",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <section className="doodle-card rise rise-4 mt-6 p-6">
          <Tabs value={mode} onValueChange={(v) => setMode(v as "text" | "audio")}>
            <TabsList className="ui-sans rounded-full">
              <TabsTrigger value="text" className="rounded-full">
                Write
              </TabsTrigger>
              <TabsTrigger value="audio" className="rounded-full">
                Speak
              </TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="space-y-3">
              <Textarea
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                rows={10}
                placeholder="Say it the way you'd actually say it…"
                className="ui-sans resize-y rounded-3xl text-base"
              />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="ui-sans text-sm text-muted-foreground">
                  {liveNoonan
                    ? `${liveNoonan.wordCount} words · ${liveNoonan.shortWordShare}% short words`
                    : "Aim for 60–150 words"}
                </span>
                <Magnetic strength={0.25}>
                  <Button
                    size="lg"
                    className="tactile rounded-full font-bold"
                    onClick={submitText}
                    disabled={!!stage}
                  >
                    {stage ? "Analysing…" : "Get coached"}
                  </Button>
                </Magnetic>
              </div>
            </TabsContent>

            <TabsContent value="audio" className="space-y-3">
              <p className="ui-sans text-sm text-muted-foreground">
                Record your answer out loud — we transcribe it and measure pace, fillers and
                prosody.
              </p>
              <Button
                size="lg"
                className={cn("tactile rounded-full font-bold", recording && "breathe")}
                variant={recording ? "destructive" : "default"}
                onClick={toggleRecording}
                disabled={!!stage && !recording}
              >
                {recording ? "Stop & analyse" : "Start recording"}
              </Button>
              {response && mode === "audio" && (
                <div className="doodle-soft ui-sans rounded-3xl p-3 text-sm">
                  <span className="font-semibold">Transcript:</span> {response}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </section>

        {stage && (
          <div className="mt-5">
            <AnalysisProgress stage={stage} />
          </div>
        )}

        <div ref={resultsRef} className="mt-6">
          {scoring && noonan && (
            <ResultsView
              scoring={scoring}
              rhetoric={rhetoric}
              noonan={noonan}
              response={response}
              speech={speech}
              craft={craft}
              session={lastSession ?? undefined}
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}
