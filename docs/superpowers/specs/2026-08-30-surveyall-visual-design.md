# SurveyAll — Visual Design: "Paper Ballot"

**Date:** 2026-08-30
**Status:** Approved direction (owner picked "Paper ballot" from three options).
**Scope:** Visual identity + UI/UX for every existing page (home, /surveys list,
editor, results, /s/[slug] respond + done). Light theme only — the design commits
to a paper look deliberately.

## Thesis

SurveyAll's two artifacts are the questionnaire and the tally. The design borrows
the vernacular of well-set official forms — ballot papers, OMR bubble sheets,
punch cards — and makes answering feel like filling a beautifully printed form.
The respondent path (a stranger, on a phone, one tab) gets the most care.

## Tokens

Color (CSS custom properties in `app/globals.css`):

| Token | Hex | Use |
|---|---|---|
| `--paper` | `#FAFAF7` | page background (warm paper white — not cream) |
| `--ink` | `#1F2A37` | text, filled marks |
| `--stamp` | `#3D46B2` | ballot-ink indigo: primary buttons, links, selected marks, focus rings |
| `--pencil` | `#6B7280` | muted labels, secondary text |
| `--rule` | `#D8D6CE` | hairlines (used sparingly: section heads, table rows) |
| `--flag` | `#B4552D` | errors, closed state — rare |
| `--card` | `#FFFFFF` | form cards on paper |

Type (via `next/font/google`, self-hosted by Next — no CDN):

- **Display:** Bricolage Grotesque — page titles, survey titles. Chunky ballot-heading
  energy. Used with restraint (two sizes max).
- **Body/UI:** Public Sans — everything else. Chosen for subject resonance: it is the
  US government's digital-services typeface — the modern official form.
- **Utility:** IBM Plex Mono — slugs (`№ x7k2p9q1`), counts, statuses, question
  numbers. Punch-card heritage.

Scale: display 28–36px/700; section 18px/600; body 15–16px/400; utility 12–13px.

## Layout

Single narrow column, `max-width: 42rem`, centered, generous vertical rhythm — a
form on a desk. Site header: wordmark "SurveyAll" (display face, ink) linking home;
nothing else (no fake nav). Cards (`--card`, 1px `--rule` border, 6px radius,
no shadows or one very soft shadow) hold forms; the page itself stays paper.

## Signature element — the OMR fill mark

Custom-styled radio (circle) and checkbox (square) inputs, drawn as outlined marks
that FILL with `--stamp` ink when selected (inner dot / inner fill, ~120ms ease-in,
disabled under `prefers-reduced-motion`). This is the one memorable element and it
lives exactly where the product lives: choosing an answer. Implementation:
`appearance-none` inputs with pseudo-element fills — real inputs, keyboard and
screen-reader intact, visible `:focus-visible` ring in `--stamp`.

Garnish (quiet, respond page only): a dashed `--rule` "tear line" above the form,
and the survey slug set in mono as a serial number.

Everything else stays disciplined: rectangular buttons (4px radius), sentence-case
labels, no gradients, no pills, no numbered-marker decoration. Question numbers
(mono `01`, `02`…) ARE used — question order is real information in a survey.

## Components

- **Buttons:** primary = `--stamp` bg, white text; secondary = transparent,
  1px `--ink` border; destructive/close = `--flag` outline. Active verbs:
  "Create survey", "Publish", "Close survey", "Save changes", "Submit answers".
- **Status chips (mono, uppercase, 11px):** draft = `--pencil` outline;
  published = `--stamp` solid; closed = `--flag` outline.
- **Tally bars (results):** solid `--stamp` bars on a `--rule` baseline, mono
  counts right-aligned; zero-count options render an empty baseline (honest zeros).
  Free-text answers as a plain quoted list; ratings as mono average + per-value bars.
- **Rating input (respond):** row of square buttons min..max, selected fills ink.
- **Errors:** inline, `--flag` text on a left `--flag` 2px border strip, plain
  language ("Title is required"), `role="alert"` kept.
- **Empty states:** invitation to act ("No surveys yet — create your first one.").
- **Closed survey (respond page):** calm notice + results link when allowed.

## Copy rules

Sentence case everywhere; active verbs on controls; the action keeps its name
through the flow (Publish → "Published"). No filler, no apologies in errors.

## Quality floor

Responsive to 360px; visible keyboard focus everywhere; `prefers-reduced-motion`
respected; labels wired (`htmlFor`/fieldset/legend per question); tap targets
≥44px on the respond path; contrast ≥ WCAG AA (all token pairs above pass on
`--paper`/`--card`).
