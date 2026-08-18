import { createFileRoute } from "@tanstack/react-router";
import { ClientOnly } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { HomeScreen } from "@/components/HomeScreen";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Articulate AI — Practice speaking, get coached instantly" },
      {
        name: "description",
        content:
          "Write or speak an answer, get scored on seven dimensions, see your persuasion split, and learn the rhetorical moves that make it land.",
      },
      { property: "og:title", content: "Articulate AI — your personal communication coach" },
      {
        property: "og:description",
        content:
          "Daily speaking practice with instant scoring, a persuasion triangle, and a 24-lesson rhetoric curriculum.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <ClientOnly fallback={<AppShell><div className="h-96" /></AppShell>}>
      <HomeScreen />
    </ClientOnly>
  );
}
