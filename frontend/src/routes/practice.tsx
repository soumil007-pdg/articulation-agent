import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { PracticeRoom } from "@/components/PracticeRoom";

export const Route = createFileRoute("/practice")({
  head: () => ({
    meta: [
      { title: "Practice room — Articulate AI" },
      {
        name: "description",
        content:
          "A distraction-free room to write or speak one honest answer, then get coached on clarity, structure and persuasion.",
      },
      { property: "og:title", content: "The practice room — Articulate AI" },
      {
        property: "og:description",
        content: "Write or speak your answer and get instant coaching on how it lands.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PracticePage,
});

function PracticePage() {
  return (
    <ClientOnly fallback={<AppShell><div className="h-96" /></AppShell>}>
      <PracticeRoom />
    </ClientOnly>
  );
}
