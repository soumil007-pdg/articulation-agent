/**
 * Turns saved sessions into a printable report.
 *
 * We deliberately render our own paper-friendly HTML rather than screenshotting
 * the app: the on-screen layout is built for a dark, wide, interactive canvas
 * and reads badly on A4. This keeps every word the coach produced — scores,
 * justifications, rhetoric notes, the full response — just laid out for paper.
 *
 * Printing goes through a hidden iframe so no popup blocker can eat it; the
 * user picks "Save as PDF" in the browser's own print dialog.
 */

import { DIMENSIONS } from "./analysis";
import type { Session } from "./storage";

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

/** Speech metrics are a loose bag from the Python service — show the scalars. */
function speechRows(speech?: Record<string, unknown> | null): string {
  if (!speech) return "";
  const rows = Object.entries(speech)
    .filter(([, v]) => typeof v === "number" || typeof v === "string")
    .map(
      ([k, v]) =>
        `<div class="metric"><div class="metric-k">${esc(k)}</div><div class="metric-v">${esc(v)}</div></div>`,
    );
  if (rows.length === 0) return "";
  return section("Speech metrics", `<div class="metrics">${rows.join("")}</div>`);
}

function section(title: string, body: string): string {
  return `<section><h2>${esc(title)}</h2>${body}</section>`;
}

function sessionBody(s: Session): string {
  const sc = s.scoring;
  const rh = s.rhetoric;
  const no = s.noonan;

  const dims = DIMENSIONS.map((d) => {
    const e = sc?.scores?.[d];
    const pct = Math.max(0, Math.min(100, e?.score ?? 0));
    return `
      <div class="dim">
        <div class="dim-head">
          <span class="dim-name">${esc(d)}</span>
          <span class="dim-score">${e?.score ?? "—"}/100</span>
        </div>
        <div class="bar"><span style="width:${pct}%"></span></div>
        <p class="dim-just">${esc(e?.justification)}</p>
      </div>`;
  }).join("");

  const p = sc?.persuasion;
  const persuasion = p
    ? section(
        "Persuasion balance",
        `<div class="metrics">
          <div class="metric"><div class="metric-k">Ethos (credibility)</div><div class="metric-v">${esc(p.ethos)}%</div></div>
          <div class="metric"><div class="metric-k">Pathos (emotion)</div><div class="metric-v">${esc(p.pathos)}%</div></div>
          <div class="metric"><div class="metric-k">Logos (logic)</div><div class="metric-v">${esc(p.logos)}%</div></div>
        </div>
        ${p.advice ? `<p class="note">${esc(p.advice)}</p>` : ""}`,
      )
    : "";

  const noonan = no
    ? section(
        "Noonan craft check",
        `<p class="lead">${esc(no.verdict)} <span class="muted">(${esc(no.score)}/100)</span></p>
        <div class="metrics">
          <div class="metric"><div class="metric-k">Words</div><div class="metric-v">${esc(no.wordCount)}</div></div>
          <div class="metric"><div class="metric-k">Sentences</div><div class="metric-v">${esc(no.sentenceCount)}</div></div>
          <div class="metric"><div class="metric-k">Avg length</div><div class="metric-v">${esc(no.avgSentenceLength)}w</div></div>
          <div class="metric"><div class="metric-k">Short words</div><div class="metric-v">${esc(no.shortWordShare)}%</div></div>
        </div>
        ${no.flabbyWords?.length ? `<p class="note"><b>Swap for shorter words:</b> ${esc(no.flabbyWords.join(", "))}</p>` : ""}
        ${no.hedges?.length ? `<p class="note"><b>Hedges to cut:</b> ${esc(no.hedges.join(", "))}</p>` : ""}`,
      )
    : "";

  const deviceList = (items: { name: string; evidence?: string; tip?: string }[], key: "evidence" | "tip") =>
    items.length
      ? `<ul class="devices">${items
          .map(
            (d) =>
              `<li><b>${esc(d.name)}</b>${d[key] ? ` — ${key === "evidence" ? `“${esc(d[key])}”` : esc(d[key])}` : ""}</li>`,
          )
          .join("")}</ul>`
      : "";

  const rhetoric = rh
    ? section(
        "Rhetorical craft",
        `<p class="lead">${esc(rh.summary)} <span class="muted">(${esc(rh.rhetoricalScore)}/10)</span></p>
        ${rh.found?.length ? `<h3>Devices you used</h3>${deviceList(rh.found, "evidence")}` : ""}
        ${rh.opportunities?.length ? `<h3>Opportunities</h3>${deviceList(rh.opportunities, "tip")}` : ""}
        ${rh.overuseWarning ? `<p class="note">${esc(rh.overuseWarning)}</p>` : ""}
        ${
          rh.suggestion?.device
            ? `<h3>Try this next: ${esc(rh.suggestion.device)}</h3>
               <p class="note">${esc(rh.suggestion.tip)}</p>
               ${rh.suggestion.exampleRewrite ? `<p class="quote">“${esc(rh.suggestion.exampleRewrite)}”</p>` : ""}`
            : ""
        }`,
      )
    : "";

  return `
    <article class="session">
      <header class="s-head">
        <div>
          <div class="eyebrow">${esc(s.goal)} · ${esc(s.audience)} · ${esc(s.mode)}</div>
          <h1>${esc(s.prompt)}</h1>
          <div class="muted">${esc(fmtDate(s.date))}</div>
        </div>
        <div class="overall">
          <div class="overall-n">${Math.round(sc?.overallScore ?? 0)}</div>
          <div class="overall-l">overall</div>
        </div>
      </header>

      ${section("What the coach heard", `<p class="lead">${esc(sc?.interpretedMeaning)}</p>`)}
      ${sc?.keyActionItem ? `<div class="action"><div class="eyebrow">Key action item</div><div>${esc(sc.keyActionItem)}</div></div>` : ""}
      ${section("Seven dimensions", `<div class="dims">${dims}</div>`)}
      ${persuasion}
      ${noonan}
      ${rhetoric}
      ${speechRows(s.speech)}
      ${section("Your response", `<blockquote>${esc(s.response).replace(/\n/g, "<br>")}</blockquote>`)}
    </article>`;
}

const STYLES = `
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 32px 36px;
    font-family: Georgia, "Times New Roman", serif;
    color: #1a1a22; background: #fff;
    font-size: 12pt; line-height: 1.5;
  }
  .doc-head {
    display: flex; justify-content: space-between; align-items: baseline;
    border-bottom: 2px solid #2a2a35; padding-bottom: 10px; margin-bottom: 24px;
  }
  .doc-head .brand { font-size: 17pt; font-weight: 700; letter-spacing: -0.01em; }
  .doc-head .sub { font-size: 9.5pt; color: #6a6a78; }
  .session { page-break-after: always; }
  .session:last-child { page-break-after: auto; }
  .s-head {
    display: flex; justify-content: space-between; align-items: flex-start;
    gap: 20px; margin-bottom: 20px;
  }
  .s-head h1 { font-size: 16pt; margin: 3px 0 5px; line-height: 1.25; }
  .overall { text-align: center; flex-shrink: 0; }
  .overall-n { font-size: 30pt; font-weight: 700; line-height: 1; }
  .overall-l { font-size: 8pt; text-transform: uppercase; letter-spacing: .09em; color: #6a6a78; }
  .eyebrow {
    font-size: 8pt; text-transform: uppercase; letter-spacing: .09em;
    color: #6a6a78; font-family: Helvetica, Arial, sans-serif; font-weight: 700;
  }
  section { margin-bottom: 18px; page-break-inside: avoid; }
  h2 {
    font-size: 8.5pt; text-transform: uppercase; letter-spacing: .09em;
    color: #6a6a78; font-family: Helvetica, Arial, sans-serif;
    border-bottom: 1px solid #ddd; padding-bottom: 4px; margin: 0 0 9px;
  }
  h3 { font-size: 11pt; margin: 12px 0 5px; }
  p { margin: 0 0 7px; }
  .lead { font-size: 12.5pt; }
  .muted { color: #6a6a78; font-size: 10pt; }
  .note { font-size: 10.5pt; color: #3a3a48; }
  .quote { font-style: italic; color: #3a3a48; }
  .action {
    border-left: 3px solid #d99a3a; background: #fdf6e9;
    padding: 9px 13px; margin-bottom: 18px; page-break-inside: avoid;
  }
  .dims { display: grid; grid-template-columns: 1fr 1fr; gap: 11px 26px; }
  .dim { page-break-inside: avoid; }
  .dim-head { display: flex; justify-content: space-between; align-items: baseline; }
  .dim-name { font-weight: 700; text-transform: capitalize; }
  .dim-score { font-size: 9.5pt; color: #6a6a78; font-family: Helvetica, Arial, sans-serif; }
  .bar { height: 5px; background: #e8e8ee; border-radius: 3px; overflow: hidden; margin: 3px 0 4px; }
  .bar span { display: block; height: 100%; background: #5b4a9e; }
  .dim-just { font-size: 10pt; color: #4a4a58; margin: 0; }
  .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; }
  .metric { border: 1px solid #e2e2ea; border-radius: 6px; padding: 7px 10px; }
  .metric-k {
    font-size: 8pt; text-transform: uppercase; letter-spacing: .05em;
    color: #6a6a78; font-family: Helvetica, Arial, sans-serif;
  }
  .metric-v { font-size: 13pt; font-weight: 700; }
  .devices { margin: 0; padding-left: 18px; font-size: 10.5pt; }
  .devices li { margin-bottom: 3px; }
  blockquote {
    margin: 0; padding: 11px 15px; border-left: 3px solid #c9c9d4;
    background: #f8f8fb; font-size: 11.5pt;
  }
  @page { margin: 15mm; }
  @media print { body { padding: 0; } }
`;

function wrapDocument(title: string, subtitle: string, body: string): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(title)}</title><style>${STYLES}</style></head>
<body>
  <div class="doc-head">
    <span class="brand">Articulate AI</span>
    <span class="sub">${esc(subtitle)}</span>
  </div>
  ${body}
</body></html>`;
}

/**
 * Opens the browser's print dialog on generated HTML via a hidden iframe.
 * The user chooses "Save as PDF" (or a real printer) from there.
 */
function printHtml(html: string) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(frame);

  const cleanup = () => {
    // Give the print dialog time to take its snapshot before we tear the frame down.
    window.setTimeout(() => frame.remove(), 1000);
  };

  frame.onload = () => {
    const win = frame.contentWindow;
    if (!win) return cleanup();
    win.focus();
    win.print();
    cleanup();
  };

  const doc = frame.contentDocument;
  if (!doc) {
    frame.remove();
    return;
  }
  doc.open();
  doc.write(html);
  doc.close();
}

/** Print / save one session as a PDF. */
export function printSessionReport(session: Session) {
  printHtml(
    wrapDocument(
      `Articulate — ${session.prompt}`.slice(0, 80),
      fmtDate(session.date),
      sessionBody(session),
    ),
  );
}

/** Print / save the whole history as one PDF, newest first. */
export function printAllSessions(sessions: Session[], name?: string) {
  const subtitle = `${sessions.length} session${sessions.length === 1 ? "" : "s"}${name ? ` · ${name}` : ""}`;
  printHtml(
    wrapDocument("Articulate — session history", subtitle, sessions.map(sessionBody).join("")),
  );
}
