import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ClientOnly } from "@tanstack/react-router";
import { HealthIndicator } from "./HealthIndicator";
import { StarfieldCanvas } from "./StarfieldCanvas";
import { CinematicIntro } from "./CinematicIntro";
import { CustomCursor } from "./CustomCursor";
import { BrandMark } from "./BrandMark";
import { useSound } from "@/lib/sound";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Home", icon: HomeIcon },
  { to: "/practice", label: "Practice", icon: PracticeIcon },
  { to: "/path", label: "The Path", icon: PathIcon },
  { to: "/scenarios", label: "Scenarios", icon: ScenarioIcon },
  { to: "/stats", label: "Stats", icon: StatsIcon },
  { to: "/you", label: "You", icon: YouIcon },
] as const;

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" {...stroke}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6.5 10.5V20h11v-9.5" />
      <path d="M10 20v-5h4v5" />
    </svg>
  );
}
function PracticeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" {...stroke}>
      <path d="M12 4a2.5 2.5 0 0 1 2.5 2.5v5a2.5 2.5 0 0 1-5 0v-5A2.5 2.5 0 0 1 12 4z" />
      <path d="M6.5 11a5.5 5.5 0 0 0 11 0" />
      <path d="M12 16.5V20" />
    </svg>
  );
}
function PathIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" {...stroke}>
      <path d="M5 20c4 0 4-6 0-6s-4-6 1-6h8" />
      <circle cx="18" cy="7" r="3" />
      <circle cx="8" cy="20" r="1.6" />
    </svg>
  );
}
function ScenarioIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" {...stroke}>
      <path d="M4 6.5h7v6H6.5L4 15z" />
      <path d="M13 10h7v6h-3l-2.5 2.5V16H13z" />
    </svg>
  );
}
function StatsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" {...stroke}>
      <path d="M4 19h16" />
      <path d="M7 19v-6" />
      <path d="M12 19V6" />
      <path d="M17 19v-9" />
    </svg>
  );
}
function YouIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" {...stroke}>
      <circle cx="12" cy="9" r="3.5" />
      <path d="M5 20c1.5-4 12.5-4 14 0" />
    </svg>
  );
}

function SoundToggle() {
  const { on, toggle } = useSound();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? "Mute sound" : "Enable sound"}
      className="tactile flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground"
    >
      <svg viewBox="0 0 24 24" className="size-4" {...stroke} strokeWidth={2}>
        <path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" />
        {on ? (
          <>
            <path d="M16 9.5a4 4 0 0 1 0 5" />
            <path d="M18.6 7a7.5 7.5 0 0 1 0 10" />
          </>
        ) : (
          <path d="M16.5 10l4 4m0-4-4 4" />
        )}
      </svg>
      {on ? "Sound on" : "Sound off"}
    </button>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="paper-mint sky-host min-h-screen">
      <ClientOnly fallback={null}>
        <StarfieldCanvas />
      </ClientOnly>
      <ClientOnly fallback={null}>
        <CustomCursor />
      </ClientOnly>
      <ClientOnly fallback={null}>
        <CinematicIntro />
      </ClientOnly>

      <div className="mx-auto flex w-full max-w-[1600px] flex-col lg:flex-row">
        {/* desktop sidebar */}
        <aside className="vt-nav sticky top-0 z-30 hidden h-screen w-64 shrink-0 flex-col gap-6 border-r-2 border-border bg-sidebar/80 px-5 py-7 backdrop-blur lg:flex">
          <BrandMark glyphSize={34} />
          <nav className="flex flex-col gap-1.5">
            {NAV.map(({ to, label, icon: Icon }) => {
              const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
              return (
                <Link
                  key={to}
                  to={to}
                  viewTransition
                  className={cn(
                    "tactile flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-base font-bold",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-sidebar-accent",
                  )}
                >
                  <Icon />
                  {label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto flex flex-col gap-3">
            <ClientOnly fallback={null}>
              <SoundToggle />
            </ClientOnly>
            <ClientOnly fallback={null}>
              <HealthIndicator />
            </ClientOnly>
          </div>
        </aside>

        {/* mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b-2 border-border bg-background/85 px-4 py-3 backdrop-blur lg:hidden">
          <BrandMark glyphSize={30} />
          <ClientOnly fallback={null}>
            <HealthIndicator compact />
          </ClientOnly>
        </header>

        <main className="min-w-0 flex-1 px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-16 lg:pt-10">
          <div key={pathname} className="page-in vt-shell">
            {children}
          </div>
        </main>

      </div>

      {/* mobile bottom nav */}
      <nav className="vt-nav-mobile fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t-2 border-border bg-background/95 px-2 py-2 backdrop-blur lg:hidden">
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              viewTransition
              className={cn(
                "tactile flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-bold",
                active ? "text-primary" : "text-muted-foreground",
              )}
            >
              <Icon />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
