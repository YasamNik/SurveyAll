# SurveyAll — High-Level Design

**Date:** 2026-08-27
**Status:** Approved (design). Not yet implemented.
**Scope:** Whole-product architecture and product requirements, plus the concrete
deliverables of the first ("foundation") build cycle.

---

## 1. Product requirements

### Audience and distribution model

Public / broad distribution. Surveys are published to anyone with a link.
Respondents need no account. Calendar scheduling is a companion capability the
organiser uses for their own group.

### Actors

- **Author** — authenticated (Google OAuth or email magic link). Owns surveys and
  scheduling events, distributes them, reads results.
- **Respondent** — may be anonymous or signed in. Arrives via link, answers, leaves.

The asymmetry between these two is the product's defining constraint: everything on
the respondent path must work for someone who has never heard of SurveyAll, on a
phone, in one tab, with zero friction.

### Identity is a spectrum

Being signed in earns a respondent something; it is never a wall.

| | Anonymous respondent | Signed-in respondent |
|---|---|---|
| Can answer | yes | yes |
| Response linked to account | no | yes (`user_id`) |
| Appears in "things I participated in" | no | yes |
| Can view results | only if the author enabled it | yes |
| One-answer-per-person enforceable | no (best effort) | yes, DB constraint |

This yields a subset of responses with real integrity while preserving the
click-a-link-and-answer path.

### Capability area 1 — Surveys

- **Authoring.** Title, optional description, ordered list of questions. Question
  types in scope: single-choice, multi-choice, free text, rating scale. Each
  question is required or optional.
- **Lifecycle.** `draft → published → closed`. Publishing mints a public slug and
  freezes the question set — editing questions under live responses corrupts
  results, so it is forbidden by design. Closing stops new submissions; results
  remain readable.
- **Distribution.** A public URL. Nothing else in v1 (no QR, no email blast, no
  embeds).
- **Responding.** Open link → answer → submit once. No partial save, no editing
  after submit, no login required.
- **Results.** Response count, per-option tallies, list of free-text answers.
  Visibility to anonymous respondents is a per-survey author toggle
  (`show_results_to_respondents`). CSV export deferred.

### Capability area 2 — Scheduling

A When2Meet-style overlap heatmap, **not** a discrete slot poll.

- The author defines a **date range** and a **daily time window** (e.g. Mar 3–7,
  09:00–18:00) and paints their own availability on the resulting grid.
- Each participant paints theirs on the same grid. Anonymous participants supply a
  **display name** (this is required — the heatmap attributes cells to people);
  signed-in participants get their profile name automatically.
- Everyone sees an **overlap heatmap**: pale where few are available, deepening to
  strong green where everyone is. Hovering or tapping a cell lists who is available
  there — signed-in users by display name, anonymous ones as their entered name.
- **Grid granularity is fixed at 30 minutes.**
- **Timezones** are designed explicitly: slots are stored as UTC instants and always
  rendered in the *viewer's* local zone. The author's timezone is stored for display
  reference only and never affects storage.
- Deferred: Google Calendar integration, recurring events, auto-booking the winner,
  explicit invitee lists.

### Surveys and scheduling are separate domains

A painted availability grid is not a survey question: the response is N cells rather
than one answer, the aggregate is a per-cell density map rather than a tally, and the
input is a drag-to-paint gesture with nothing in common with a radio button. Forcing
it into the survey engine would require a "question type" that ignores most of what a
question is.

They are therefore two domain modules that share what is genuinely shared: auth, the
public-link/slug mechanism, participation history, abuse controls, and (later)
notifications.

### Cross-cutting requirements

- **Abuse control.** Public links are scrapable. Per-IP rate limiting on submit, plus
  a best-effort per-browser token to discourage casual double-answering. The product
  explicitly does **not** claim one-person-one-vote for anonymous responses, and the
  UI must not imply it.
- **Privacy.** No respondent PII is collected by default. Anonymous responses carry
  no user reference.
- **API.** `/api/v1` is versioned and client-agnostic from the first endpoint, so a
  future native client is a first-class consumer rather than a retrofit.
- **Accessibility.** The respond flow is keyboard- and screen-reader-usable. It is
  the flow strangers use; it is the one that has to be right.

### Explicit non-goals (v1 and the cycle after)

Respondent accounts as a requirement · editing a submitted response · branching or
skip logic · organisations, teams, or roles · survey templates · i18n · native app ·
payments.

---

## 2. Architecture

### Stack

- **Next.js (App Router) on Vercel** — web client and API in one TypeScript project.
- **Supabase Postgres** — database, plus Supabase Auth for authors
  (Google OAuth + email magic link).
- **Web now, native later.** No native client is built in the foreseeable cycles, but
  the API contract is designed as though one exists.

### Repo shape — layered single app

```
app/
  (app)/                    authenticated author UI
  s/[slug]/                 public survey respond page
  e/[slug]/                 public scheduling grid
  api/v1/                   HTTP adapter — the future native app's contract
lib/
  domain/
    surveys/                lifecycle rules, validation, tally
    scheduling/             grid generation, availability, heatmap aggregation
    shared/                 slugs, ids, DomainError
  db/                       supabase clients, queries, generated types
  auth/
supabase/migrations/
```

**The rule that makes this work:** `lib/domain/**` imports nothing from `next/*`,
`react`, or `@supabase/*`. It is pure TypeScript over plain data. Both adapters —
Server Components for the web UI, route handlers for `/api/v1` — sit above it. This
is enforced by an ESLint `no-restricted-imports` rule in CI, not by discipline,
because it is the boundary a future native client depends on.

The web UI calls the domain layer **directly on the server** rather than fetching its
own `/api/v1` — one source of truth, no self-HTTP hop.

A Turborepo monorepo (`packages/domain`, `apps/web`, `apps/mobile`) was considered and
rejected for now: it enforces the same boundary at meaningfully higher cost on a
solo, two-machine project, and `git mv lib/domain packages/domain` remains available
later. Choose it only if a native client becomes imminent.

### Security model — server-mediated, RLS as defence in depth

All data access goes through the server (route handlers / Server Actions) via the
domain layer. RLS policies are still written and tested, as a second wall rather than
the only one.

The alternative — handing the Supabase anon key to the public and letting RLS be the
entire authorisation model — fails here because respondents are anonymous: rate
limiting, dedupe heuristics, and response validation are server concerns and require
a server. Server mediation also gives the future native client one API contract
instead of two access patterns to secure.

**Operational consequence:** the service-role key must never reach the client bundle.

---

## 3. Data model

Nine tables. `auth.users` is Supabase-managed.

### Identity (shared)

```
profiles          id → auth.users, display_name, avatar_url, created_at
```

### Surveys

```
surveys           id, author_id → profiles, title, description,
                  status (draft|published|closed),
                  slug (unique, null until published),
                  show_results_to_respondents bool,
                  published_at, closed_at, created_at, updated_at

questions         id, survey_id, position, prompt, required,
                  type (single_choice|multi_choice|free_text|rating),
                  config jsonb            -- rating min/max/labels only

question_options  id, question_id, position, label

survey_responses  id, survey_id, user_id -> profiles NULL, submitted_at,
                  client_token NULL, ip_hash
                  UNIQUE (survey_id, user_id) WHERE user_id IS NOT NULL

answers           response_id, question_id,
                  option_id NULL, text_value NULL, number_value NULL
                  PK (response_id, question_id, option_id)
```

**Options are a table, not JSON.** An option needs a stable identity regardless of
storage: storing the option's *text* in an answer means a rename splits the tally,
and storing its *array index* means a reorder silently rewrites everyone's answers.
Once every option has an id, a table is the natural home — and it makes a tally a
plain `GROUP BY` with a `LEFT JOIN` that surfaces zero-count options for free, plus a
foreign key preventing answers from referencing options that no longer exist. `jsonb`
is used where it fits and is never joined or grouped: `questions.config`.

**Multi-choice writes one `answers` row per selected option**, so every question type
aggregates through the same query shape.

The partial unique index is where the identity spectrum lands: signed-in users get a
real one-response-per-survey constraint enforced by Postgres; anonymous rows are
unconstrained, exactly as honest as the model allows.

### Scheduling

```
schedule_events        id, author_id -> profiles, title, description,
                       slug (unique), author_timezone,
                       date_start, date_end,           -- e.g. Mar 3 -> Mar 7
                       day_start_time, day_end_time,   -- e.g. 09:00 -> 18:00
                       status, created_at

schedule_participants  id, event_id, user_id -> profiles NULL,
                       display_name, client_token, created_at
                       UNIQUE (event_id, user_id) WHERE user_id IS NOT NULL

availability_slots     participant_id, slot_start timestamptz
                       PK (participant_id, slot_start)
```

**The author is just a participant** — a `schedule_participants` row whose `user_id`
is the author. Their availability paints through the same path as everyone else's, so
there is no privileged second write path to build or secure.

**Availability is one row per painted 30-minute cell**, stored as a UTC instant. The
heatmap is one query (`SELECT slot_start, count(*) ... GROUP BY slot_start`), and the
hover-names list is that query joined to participants. A 5-day × 9-hour event with 20
people is roughly 1,800 rows, which stays trivial well past any realistic group size.

Because granularity is fixed at 30 minutes it is not stored. Making it configurable
later means adding a column to `schedule_events`; existing rows stay valid.

### Participation history

Derived, no extra table: `survey_responses WHERE user_id = me` unioned with
`schedule_participants WHERE user_id = me`, sorted by date.

---

## 4. API surface

### Authoring (authenticated, author-scoped)

```
POST   /api/v1/surveys                        GET /api/v1/surveys
GET|PATCH|DELETE /api/v1/surveys/:id
POST   /api/v1/surveys/:id/publish | /close
PUT    /api/v1/surveys/:id/questions/:qid     whole-question diff, see below
GET    /api/v1/surveys/:id/results
        ... same shape under /api/v1/events for scheduling
```

### Public (anonymous allowed)

```
GET  /api/v1/public/surveys/:slug             published only; never returns results
POST /api/v1/public/surveys/:slug/responses
GET  /api/v1/public/surveys/:slug/results     403 unless show_results_to_respondents

GET  /api/v1/public/events/:slug
POST /api/v1/public/events/:slug/participants   { display_name } -> participant token
PUT  /api/v1/public/events/:slug/availability   full replace of painted cells
GET  /api/v1/public/events/:slug/heatmap        counts + names per slot
```

### Me

```
GET  /api/v1/me/participation                 the derived union above
```

### Whole-question diff

The authoring endpoint accepts an entire question as one JSON payload, options
included, and the server reconciles it against storage in a single transaction. This
gives JSON ergonomics on the wire with table storage underneath; the client never
issues three calls to move an option.

```
PUT /api/v1/surveys/:id/questions/:qid
{ "prompt": "Favourite language?", "type": "single_choice",
  "options": [ { "id": "opt_a1", "label": "TypeScript" },   // existing -> update
               { "id": "opt_b2", "label": "Rust" },          // existing -> update
               {                  "label": "Go" } ] }        // no id  -> insert
                                                             // stored but absent -> delete
```

While a survey is a **draft**, all option edits are ordinary inserts, updates,
position changes, and deletes — nothing references them yet. Once **published**, the
question set freezes: renaming a label stays allowed (answers point at `option_id`,
so a typo fix is invisible to the data), while adding or deleting options is refused,
because deletion would destroy referencing answers and addition would make early and
late responses non-comparable.

### Notes on the public surface

- `PUT .../availability` **replaces the whole painted set** rather than diffing cells.
  A paint gesture touches dozens of cells; one idempotent write is far simpler than a
  stream of deltas.
- The public survey endpoint physically cannot return results. Results live at a
  separate path with their own authorisation check, so the visibility toggle cannot
  leak through the wrong handler.

### How an anonymous scheduling participant returns

Creating a participant sets an **opaque token in an httpOnly cookie scoped to that
event**; returning with the cookie lets that person edit their own cells. Without the
cookie, retyping the same name produces a second participant row — the same behaviour
as When2Meet, and the honest outcome given no identity. Signed-in participants are
keyed by `user_id` and work across devices, which is one more quiet reason to sign in.

### Errors and validation

Zod schemas validate at the adapter boundary, so nothing unvalidated reaches the
domain. The domain throws `DomainError` with a stable code (`SURVEY_CLOSED`,
`ALREADY_RESPONDED`, `QUESTIONS_FROZEN`); the HTTP adapter maps code -> status, the
web adapter maps code -> message. One rule, phrased once, enforced in both places.

---

## 5. The foundation cycle

The first build cycle ships no user-facing feature. Each deliverable has a
verification that either passes or does not.

### 1. Repo scaffold

Next.js App Router, TypeScript `strict`, Tailwind, ESLint + Prettier, pnpm. The
`lib/domain` import-boundary rule goes in on day one.

**Verified:** `pnpm typecheck && pnpm lint && pnpm build` clean, and a deliberate
`import { cookies } from 'next/headers'` inside `lib/domain/` fails lint.

### 2. Auth

Supabase project; Google OAuth + email magic link; `@supabase/ssr` cookie sessions;
middleware guarding `(app)/*`; a Postgres trigger on `auth.users` insert creating the
matching `profiles` row.

**Verified:** sign in with Google on a *deployed preview*, land in `(app)`, `profiles`
row exists with the correct display name; sign out clears the session; hitting
`(app)` anonymously redirects. Magic link verified end to end the same way.

### 3. Schema + migrations

All nine tables, RLS enabled on **every** one, migrations authored via the Supabase
CLI and committed to git. Generated TypeScript types checked in.

**Verified:** `supabase db reset` on a clean database applies every migration in order
without error; generated types compile; an RLS suite proves the negatives —
anonymous cannot read a draft survey, author B cannot read author A's surveys,
anonymous cannot read raw `answers` rows.

The negative tests matter more than the positive ones. Server-mediated access makes
RLS the second wall, and an untested second wall is decoration.

### 4. CI

GitHub Actions on every PR: typecheck, lint, domain unit tests (Vitest), migrations
applied against an ephemeral Postgres, RLS tests, and one Playwright smoke test
(load home -> sign in -> reach `(app)`).

**Verified:** a PR that breaks the import boundary, or removes an RLS policy, goes red.

### 5. Vercel

Project linked, environment variables set for development / preview / production,
PR -> preview URL, `main` -> production.

**Verified:** open a PR, click its preview URL, complete a Google sign-in there.

### 6. Thin vertical slice

`GET /api/v1/health` returning a value that came from the database via a `lib/domain`
function, plus one `(app)` page rendering that same domain call through the Server
Component adapter.

**Verified:** both return real data in production.

This is the point of the slice: it proves browser -> adapter -> domain -> db -> back is
wired, through *both* adapters, before any feature depends on it. A foundation with
no feature through it can be the wrong foundation without anyone noticing.

### Also shipped this cycle

`docs/DECISIONS.md` and `docs/STATUS.md` — required by the cross-system workflow in
`CLAUDE.md`, since the second machine otherwise starts blind.

### Explicitly not in this cycle

No survey authoring UI, no respond page, no availability grid, no results view. Six
deliverables, then stop and spec the first feature.

---

## 6. Testing strategy

- **Domain unit tests (Vitest)** — pure functions over plain data: lifecycle rules,
  validation, tally computation, grid generation, heatmap aggregation. Fast, no I/O.
  This is where most test value lives, and the import boundary is what keeps it
  possible.
- **Integration tests** — queries and RLS policies against a local Supabase instance.
  Includes the negative RLS assertions listed above.
- **E2E smoke (Playwright)** — one path through the real stack, run in CI.

TDD applies per `CLAUDE.md`: a failing test that reproduces the requirement, then the
code that satisfies it.

---

## 7. Known operational gotchas

**OneDrive and `node_modules`.** The working copy currently sits inside a OneDrive
folder. `.gitignore` keeps `node_modules` and `.next` out of git, but OneDrive syncs
them regardless — tens of thousands of files, constant churn, and file-lock failures
mid-install. Before scaffolding, either exclude those directories from sync or move
the repository outside the OneDrive tree. *(Acknowledged by the repo owner on
2026-08-27; they intend to relocate the repo.)*

**Google OAuth on preview deploys.** Google requires exact redirect URIs and Vercel
issues a new hostname per PR. Point Google at the stable *Supabase* callback URL and
let Supabase redirect onward, adding preview origins to Supabase's allow-list.

---

## 8. Open questions for the next session

None blocking. The design is complete enough to plan against. Items deliberately left
for later cycles are listed under the non-goals and deferred items above.
