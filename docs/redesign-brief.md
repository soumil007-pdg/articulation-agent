# Articulate AI — Fabulous-Doodle Redesign Brief

Handoff document. Part 1 is for a design tool / illustrator (visual system).
Part 2 is for engineering (new features). Part 3 is the combined flow.
Everything in Part 2 gets built on the *existing* backend — Groq pipeline,
Whisper, prosody, GoEmotion, the 20-device rhetoric engine, the Persuasion
Triangle — none of that changes. Only presentation and new drill modes.

---

## PART 1 — Visual System (for the design pass)

### 1.1 Two registers, not one

Every reference image sorts cleanly into one of two modes. Do not blend them.

**A. Hero mode** — dark, painterly, emotional. Used for: onboarding journey,
celebration screen, any "big feeling" moment.
- Backgrounds: deep gradient skies — indigo→violet (`Chat with Your Future
  Self`), crimson→gold sunset (`the sun logo`), cobalt→azure (`Disappear for
  one month`). Always with visible **grain/noise texture** over the gradient,
  never a flat CSS gradient.
- Illustration: painterly, airbrushed, real lighting and depth. Silhouettes
  with glowing rim-light. Sparkle/star/constellation accents.
- Type: bold rounded sans for the punch line, **italic serif for the soft
  line** (this is the emotional signature — keep Fraunces italic here, it
  already matches).
- Emphasis trick: solid-color "highlighter" rectangle behind a key phrase,
  not just bold weight.

**B. Doodle mode** — light, hand-drawn, instructional. Used for: the Academy/
Path, the Dashboard, any "here's how this works" or list/checklist content.
- Backgrounds: light solid or very soft gradient (mint, cream, peach, pale
  blue) — no dark gradient, no grain.
- Illustration: flat-ish hand-drawn line icons, small and scattered (not
  gridded when the content is emotional — e.g. an "evening routine" moodboard
  layout can break grid entirely).
- Category color-blocking: every taxonomy gets a **fixed, memorized color**
  — see 1.4.
- Type: one dominant bold rounded/hand-lettered font carries almost
  everything (headers AND body) — see 1.3.
- Motifs: paperclips, binder clips, sticky-note/polaroid blocks, dotted
  rainbow divider lines, partial pie/donut icons next to time chunks.

### 1.2 Where each mode applies in *this* app

| Screen | Mode |
|---|---|
| Journey onboarding (4 scenes) | Hero — already built, keep |
| Celebration overlay | Hero — already built, keep |
| Home / Daily Ritual card | Hero accents on a mostly-doodle base (see 3.2) |
| The Path (replaces Academy) | Doodle |
| Drill modes (new, see Part 2) | Doodle |
| Results / coaching output | Doodle |
| Dashboard | Doodle |
| Settings, History | Doodle, low-key |

### 1.3 Typography — three roles, name real fonts

1. **Display serif (hero mode only)** — Fraunces, italic, weight 400–500.
   Already integrated, keep exactly as is.
2. **Bold rounded sans (doodle headers + hero punch lines)** — something in
   the Baloo 2 / Fredoka / Quicksand-bold family. Needs real rounded
   terminals, not just a heavy weight of Inter.
3. **Hand-lettered / marker (doodle body, labels, playful microcopy)** —
   something in the Kalam / Patrick Hand / Caveat family. Used for routine
   items, drill instructions, mascot speech bubbles.

Inter stays as the *only* font for dense UI chrome (buttons, form inputs,
settings) — doodle fonts at small sizes become illegible, the references
never use them for anything but headers/labels.

### 1.4 Color taxonomy — lock these, use everywhere

Map our existing three rhetoric families + a fourth "principles" bucket to
fixed colors, the way the reference app locks Health/Career/Finances/
Relationships:

- **Repetition** → warm orange (`#e8834a`-ish)
- **Structure** → steel blue (`#4a72b8`-ish)
- **Drama** → teal (`#2ba89a`-ish)
- **Principles** → coral/red (`#e05c5c`-ish)

These colors should appear on: the Academy/Path nodes, device chips, the
family badges already in the rhetoric card, and nowhere else — don't let the
existing emerald/gold brand palette leak into doodle-mode category color.
Emerald + gold stays reserved for brand chrome (logo, primary buttons,
streak/celebration) exactly as now.

### 1.5 The mascot — brief, not a mandate

The reference app's owl works because it's a **single consistent character
with a legible personality** (scholarly, whimsical) shown across many
emotional states (celebrating, casting a spell, holding an hourglass). We
need our own, not a reskinned owl. Three directions to generate and pick
from — do not lock this without seeing options:

- **A small torch-bearer** — a simple round figure carrying a tiny flame/
  laurel torch. Flame gets brighter/bigger as streak grows.
- **A quick corvid** (raven/magpie) — ties to oratory + storytelling
  tradition, agile and clever, fits the improv/reflex drills especially well.
- **An ink-drop sprite** — a small character literally made of a drop of
  ink/quill-nib, ties directly to "words," can leave a trailing script line
  when it moves.

Whichever is chosen needs at minimum these expression states: idle/greeting,
celebrating (streak, score), thinking/encouraging (mid-drill), concerned-but-
warm (low score, never mocking), and a "casting/teaching" pose for the
Academy/Path.

### 1.6 Icon & motif style guide

- Line icons: rounded caps, ~2.5px stroke at card scale, single color per
  category (see 1.4), small sparkle accents allowed near mascot/celebration
  moments only — don't sprinkle sparkles everywhere or they stop meaning
  anything.
- Partial pie/donut icons for anything showing "share of total" — e.g. the
  Persuasion Triangle could get a compact donut variant for a summary chip,
  and per-drill duration ("2 min") could use the same shape.
- Physical/tactile motifs (paperclip, sticky note) reserved for the Path/
  Academy to reinforce "this is a real curriculum," not overused elsewhere.

### 1.7 Deliverables needed back from the design pass

1. Mascot: chosen concept + the 5 expression states above, as SVG or PNG.
2. Doodle line-icon set: ~30 icons (one per Academy lesson family/topic,
   plus routine-style icons: clock, mic, book, checkmark, flame, water/rest).
3. Two hero-mode background scenes not yet built: a Path/journey landscape
   variant and a "results/celebration" alternate.
4. Four category color swatches finalized (1.4) with light/dark variants.
5. Two font files confirmed + license-cleared (bold rounded + hand-lettered).

---

## PART 2 — New Features (from the 4 books + the 3 competitor sites)

### 2.1 Already built (confirm, don't rebuild)

- Persuasion Triangle (Aristotle: ethos/pathos/logos, benchmarked to 65/25/10)
- 20-device rhetoric engine in 3 families, Farnsworth taxonomy, with overuse
  warning
- The Academy — 24 lessons, definition → master example → drill
- Noonan craft check (small-sturdy-words, syllables/word, sentence length) —
  computed locally, instant
- TED WPM recalibration (150–190 ideal)

### 2.2 New — from the books, not yet built

- **Novelty check** (TED's "Teach Me Something New") — one Groq-scored line:
  did this text tell the listener something they likely didn't already know?
- **Jaw-Dropping Moment detector** (TED Secret #5) — does the text contain
  one surprising fact, stat, or reveal? Flag if entirely absent.
- **Humor check** (TED Secret #6, "Lighten Up") — light-touch, opt-in; most
  professional contexts shouldn't be penalized for having none.
- **The 18-Minute Discipline as a mode** — not a metric, a **drill**: take
  any past answer, re-deliver it in 60 seconds. (Ties into 2.3 below.)

### 2.3 New — from Yoodli / Orai / Speeko, genuinely new interaction shapes

These are not scoring upgrades, they're **new drill types** — the app
currently only has one interaction shape (write/speak → submit → score).
These add three more:

- **Word-Spark** (Yoodli-inspired) — live improv. User is telling a story
  (typed live or spoken), the app injects a random word at an interval, user
  must incorporate it without breaking flow. Scored on coherence + speed of
  incorporation, not the 7-dimension rubric.
- **Story Relay** (Yoodli-inspired) — the app (or the daily ritual) supplies
  an opening 1–2 sentences, user continues and closes the story. Scored on
  narrative arc (ties directly into the Storytelling Arc rhetoric device).
- **Named Scenario Drills** (Orai-inspired) — concrete, recognizable
  situations as the practice unit instead of abstract "goal" dropdowns: "The
  Toast," "The Tough Question," "The Elevator Pitch," "The Apology," "The
  Ask for a Raise." Each pre-loads context/audience defaults, same as the
  journey archetypes already do.
- **Talk-Time Balance** (Speeko-inspired) — a dialogue-aware mode: user
  practices a two-sided exchange (real or simulated), app tracks their share
  of talk time and flags monologuing or under-participating. This is the
  only one that requires new backend shape (turn-taking), flag as larger.
- **Hedging-language flag** (Speeko-inspired) — more surgical than the
  current filler list: specifically catch "I think maybe," "sort of," "just
  wanted to," "does that make sense?" as a separate category from "um/like,"
  since hedging undermines authority even when fluent.
- **Vocal warm-up ritual** (Speeko-inspired) — optional 30–60s pre-session
  step before recording: a few breathing/articulation prompts. Ties into the
  "ritual" framing already established.

---

## PART 3 — Combined Flow / IA

```
Journey Onboarding (Hero mode) — unchanged
        ↓
Home = Daily Ritual (Hero accent card on Doodle base)
   ├─ Today's Ritual (existing challenge, restyled)
   ├─ Today's Focus (existing, restyled)
   └─ NEW: Drill picker — Word-Spark / Story Relay / Named Scenario / Vocal warm-up
        ↓
Practice (Text / Audio — existing, restyled to Doodle)
        ↓
Coaching Results (Doodle mode, category-colored)
   ├─ Score dashboard (existing)
   ├─ Persuasion Triangle (existing, family-colored)
   ├─ Craft check (existing)
   ├─ Rhetoric devices (existing, now family-color-coded per 1.4)
   └─ NEW: Novelty / Jaw-drop / Humor checks
        ↓
Celebration (Hero mode) — unchanged, mascot appears here now
        ↓
The Path (was: Academy — now Doodle route-map, mascot walks it)
Dashboard (Doodle mode)
```

---

## Handoff sequence

1. This document → design tool / illustrator. Get back: mascot (5 states),
   icon set (~30), 2 hero scenes, 2 fonts, 4 category swatches.
2. Assets come back to this repo → I integrate into `frontend/` and rebuild
   the presentation layer around them (replacing the current CSS-only
   approximation).
3. In parallel or after, I build the new drill modes (2.3) and book-derived
   checks (2.2) on the existing Groq/Whisper pipeline — this needs no
   outside asset dependency and can start immediately if you want it started
   before the visual assets are ready.
