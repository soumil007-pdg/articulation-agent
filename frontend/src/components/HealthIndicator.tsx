import { useQuery } from "@tanstack/react-query";
import { getApiBase, getHealth } from "@/lib/api";
import { cn } from "@/lib/utils";

export function useHealth() {
  return useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
    refetchInterval: 30_000,
    retry: false,
  });
}

export function HealthIndicator({ compact = false }: { compact?: boolean }) {
  const { data, isError, isLoading } = useHealth();
  const state = isLoading ? "loading" : isError || !data ? "offline" : "online";

  const dot =
    state === "online" ? "bg-primary" : state === "loading" ? "bg-gold" : "bg-destructive";

  if (compact) {
    return (
      <span className="ui-sans flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <span className={cn("size-2.5 rounded-full", dot)} />
        {state === "online" ? "Coach online" : state === "loading" ? "…" : "Offline"}
      </span>
    );
  }

  return (
    <div className="doodle-soft ui-sans space-y-1.5 p-3 text-xs">
      <div className="flex items-center gap-2 font-semibold">
        <span className={cn("size-2.5 rounded-full", dot)} />
        {state === "online" ? "Coach backend online" : state === "loading" ? "Checking…" : "Backend offline"}
      </div>
      <div className="truncate text-muted-foreground">{getApiBase()}</div>
      {data && (
        <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
          {(["express", "python", "gemini"] as const).map((k) => (
            <span key={k} className="rounded-full bg-muted px-2 py-0.5">
              {k}: {String(data[k] ?? "—")}
            </span>
          ))}
          {data.model && <span className="rounded-full bg-muted px-2 py-0.5">{data.model}</span>}
        </div>
      )}
    </div>
  );
}
