import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  ClientOnly,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { warmAiService } from "../lib/api";
import { Toaster } from "@/components/ui/sonner";
import { StarfieldCanvas } from "@/components/StarfieldCanvas";
import { BrandMark } from "@/components/BrandMark";
import { Magnetic } from "@/components/Magnetic";

function NotFoundComponent() {
  return (
    <div className="night-stage">
      <ClientOnly fallback={null}>
        <StarfieldCanvas />
      </ClientOnly>
      <span className="night-vignette" aria-hidden />
      <span className="scene-wash" aria-hidden style={{ ["--scene-tint" as string]: "oklch(0.6 0.16 300)" }} />

      <div className="nf-wrap">
        <BrandMark glyphSize={38} />
        <p className="eyebrow mt-6">Off the map</p>
        <p className="nf-code">404</p>
        <h1 className="display-md max-w-lg text-balance">
          This page went quiet.
        </h1>
        <p className="hero-soft max-w-md text-lg opacity-80">
          Nothing was said here. Head back and say something worth scoring.
        </p>
        <Magnetic strength={0.28}>
          <Link to="/" className="onb-cta tactile mt-2">
            Back to practice
            <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
              <path
                d="M5 12h13m-5-5 5 5-5 5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        </Magnetic>
      </div>
    </div>
  );
}


function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Articulate AI — personal communication coaching" },
      {
        name: "description",
        content:
          "Practice speaking and writing, get scored across seven dimensions, and learn the rhetoric that makes it land.",
      },
      { property: "og:title", content: "Articulate AI" },
      {
        property: "og:description",
        content: "Personal communication coaching: scoring, persuasion analysis, rhetoric drills.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "https://articulation-agent-ruby.vercel.app/og-image.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Articulate AI" },
      {
        name: "twitter:description",
        content: "Personal communication coaching: scoring, persuasion analysis, rhetoric drills.",
      },
      { name: "twitter:image", content: "https://articulation-agent-ruby.vercel.app/og-image.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "icon", href: "/icon-192.png", type: "image/png", sizes: "192x192" },
      { rel: "icon", href: "/icon-512.png", type: "image/png", sizes: "512x512" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

let hasWarmedAi = false;

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    if (hasWarmedAi) return;
    hasWarmedAi = true;
    warmAiService();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}
