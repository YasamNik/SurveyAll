# Scheduling Vertical Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** The When2Meet-style scheduling domain, live on the open demo: create an event, share `/e/<slug>`, participants join by name and paint availability on a 30-min grid, everyone sees the overlap heatmap with per-cell names.

**Architecture:** Same layered shape as surveys — pure domain in `lib/domain/scheduling/`, Drizzle queries, thin route handlers, Server Components + one substantial client grid component. Auth still absent (owner decision): `author_id` NULL, author joins as an ordinary named participant.

**Tech stack:** existing (Next 16, Drizzle/Postgres, Zod, Vitest, Paper Ballot tokens).

**Spec:** `docs/superpowers/specs/2026-08-29-surveyall-design.md` (carries scheduling from the 2026-08-27 design §1/§3/§4) + `docs/superpowers/specs/2026-08-30-surveyall-visual-design.md`.

## Global Constraints

- `lib/domain/**` purity (ESLint-enforced); migrations via drizzle-kit only; CSS in `@layer components`, tokens only; sentence-case active-verb copy; typecheck/lint/test/build green per task; commit per task on `main` (push + prod redeploy only in the final task).
- **Ruling (supersedes one spec sentence):** `author_timezone` anchors grid *generation* — "Mar 3, 09:00" means 09:00 in the author's zone, converted to UTC instants at slot-computation time. (A naive date+time is unanchorable otherwise.) It still never re-interprets stored slots.
- **Events have no draft state:** created → slug minted immediately → `open`; `closed` stops joins and paints; heatmap stays readable.
- Hardening: title ≤200, description ≤2000, display name 1–100 chars; date range ≤ 31 days; `day_start_time < day_end_time`; painted slots must all belong to the generated grid; existing per-IP rate limit pattern reused on join + availability writes.
- Participant identity: opaque 128-bit hex token, httpOnly cookie `evt_<eventId>`, path-scoped; no cookie → joining again creates a new participant row.

---

### Task 1: Schema + scheduling domain (TDD)

**Files:**
- Modify: `lib/db/schema.ts` (+generated migration 0004)
- Create: `lib/domain/scheduling/timezone.ts`, `grid.ts`, `availability.ts` (+ a `.test.ts` beside each)

**Interfaces (binding):**

```ts
// schema additions
scheduleEvents: id text pk default uuid, authorId text→users.id nullable, title text notnull,
  description text, slug text unique notnull, authorTimezone text notnull,
  dateStart text notnull ('YYYY-MM-DD'), dateEnd text notnull,
  dayStartTime text notnull ('HH:MM'), dayEndTime text notnull,
  status text enum ['open','closed'] notnull default 'open',
  createdAt/closedAt timestamptz
scheduleParticipants: id text pk default uuid, eventId cascade notnull, userId nullable→users.id,
  displayName text notnull, clientToken text notnull unique, createdAt timestamptz
  + uniqueIndex (eventId, userId) where userId is not null
availabilitySlots: participantId text cascade notnull, slotStart timestamptz notnull,
  PK (participantId, slotStart)

// timezone.ts — pure, no deps; Intl double-conversion technique
export function zonedTimeToUtc(date: string, time: string, timeZone: string): Date
// tests: UTC identity; America/Toronto winter (-05) and summer (-04); Asia/Kolkata (+05:30); DST-boundary day

// grid.ts
export interface EventWindow { dateStart: string; dateEnd: string; dayStartTime: string; dayEndTime: string; authorTimezone: string }
export function generateSlots(w: EventWindow): string[]  // ISO UTC instants, 30-min steps, dayEnd exclusive, all days inclusive; sorted
export function validateEventWindow(w: EventWindow): void // DomainError INVALID_ANSWER: bad date/time format, dateEnd<dateStart, span>31 days, dayEnd<=dayStart, unknown timeZone
// tests: slot counts (1 day 09:00→18:00 = 18 slots), multi-day, validation branches, DST day produces the day's actual instants

// availability.ts
export function validatePaintedSlots(grid: string[], painted: unknown): string[]
// accepts string[]; dedupes; every entry must be in grid else DomainError INVALID_ANSWER 'slot outside the event grid'; cap painted.length ≤ grid.length; non-array/non-string → INVALID_ANSWER
```

- [ ] Failing tests first per module, implement, green; `db:generate` + `db:migrate`; commit.

### Task 2: Queries + APIs

**Files:**
- Create: `lib/db/queries/events.ts`, `lib/api/participant-cookie.ts`, routes:
  `app/api/v1/events/route.ts` (POST create, GET list), `app/api/v1/events/[id]/route.ts` (GET/PATCH/DELETE),
  `app/api/v1/events/[id]/close/route.ts` (POST),
  `app/api/v1/public/events/[slug]/route.ts` (GET event + grid),
  `app/api/v1/public/events/[slug]/participants/route.ts` (POST join → sets cookie),
  `app/api/v1/public/events/[slug]/availability/route.ts` (PUT full replace),
  `app/api/v1/public/events/[slug]/heatmap/route.ts` (GET)

**Interfaces (binding):**

```ts
createEvent(input: {title, description?, authorTimezone, dateStart, dateEnd, dayStartTime, dayEndTime}) → {id, slug}   // validateEventWindow first; slug randomSlug()
listEvents(); getEvent(id); patchEvent(id, {title?, description?})  // open only for window fields? window IMMUTABLE after create (participants painted against it) — title/description editable anytime
deleteEvent(id); closeEvent(id)  // open→closed else DomainError SURVEY_CLOSED('not open')
getPublicEventBySlug(slug) → { event: {title, description, slug, status, authorTimezone, dateStart, dateEnd, dayStartTime, dayEndTime}, slots: string[] }  // NOT_FOUND if missing
joinEvent(slug, displayName) → {participantId, token}  // EVENT closed → SURVEY_CLOSED; name via 1..100 trim rules
setAvailability(slug, token, painted: string[]) → void  // participant by token+event; full replace in one tx (delete+insert); closed → SURVEY_CLOSED; NOT_FOUND for bad token
getHeatmap(slug) → { participantCount, slots: { slot: string, count: number, names: string[] }[] }  // only slots with count>0; names ordered by join time
```

- Cookie: `evt_<eventId>` = token, httpOnly, sameSite lax, path `/`, maxAge 90d; helper reads it per event id.
- Zod at every boundary; reuse `handle`/`toHttp`; rate limit join+availability like responses.
- [ ] Implement, curl-verify the whole flow on :3100 (create → join ×2 → paint → heatmap counts/names → close → paint refused 409), commit.

### Task 3: Authoring UI

**Files:** `app/(app)/events/page.tsx` (list + create form: title, description, date range, daily window, timezone auto-detected client-side via `Intl.DateTimeFormat().resolvedOptions().timeZone` into a hidden input with a visible select fallback), `app/(app)/events/[id]/page.tsx` (details, share panel reuse with `/e/<slug>` path, participant count, close button, heatmap link → public page), `app/(app)/events/actions.ts`. Home page + `/surveys` header gain a plain "Events" nav link (and "Surveys" ↔ symmetric).

- [ ] Server actions mirror the surveys patterns (inline errors, guards duplicated server-side), verify in dev, commit.

### Task 4: Public event page `/e/[slug]`

**Files:** `app/e/[slug]/page.tsx` (server: loads event+slots+heatmap; reads participant cookie → knows "you"), `app/e/[slug]/join-form.tsx` (client: name → POST join), `app/e/[slug]/availability-grid.tsx` (client: the paint grid + heatmap), `app/globals.css` additions.

**Grid component contract:**
- Renders columns = days, rows = 30-min times, in the **viewer's** local zone (labels via Intl; day columns may shift vs author's — correct behavior).
- Two modes: **Paint** (only when joined & event open): pointer-drag painting (pointerdown/enter/up, `touch-action: none`, additive or erasing based on first cell), Save button → PUT availability (full set), inline saved/error state. **Heatmap** (always): each cell shaded by count/participantCount on a 5-step sequential ramp derived from `--stamp` (light tints → full indigo; 0 = paper). Tap/click a heatmap cell → small popover/list of names for that slot (plain positioned div, Esc/blur dismiss). Mode toggle = two secondary buttons ("Paint mine" / "Group heatmap"); joined users default to Paint, others see Heatmap.
- Accessibility floor: cells are buttons in a grid with aria-labels ("Tue Mar 3, 09:00 — 3 of 5 available"); keyboard: arrow-key navigation optional, but toggle-on-Enter per cell required; `prefers-reduced-motion` respected; 44px touch targets on mobile widths (cells may be smaller on desktop but ≥32px).
- Closed event: heatmap only + "This event is closed." notice.
- [ ] Verify in browser on :3100 (join two participants via two contexts, paint, heatmap counts + names popover), commit.

### Task 5: Ship

- [ ] Full suite green; push; prod build + detached restart (pidfile/pgrep kill, never a "next start" pkill pattern); through-tunnel E2E (create event via UI, join+paint through the tunnel, heatmap renders); CI green; DECISIONS.md entry (timezone-anchoring ruling, no-draft-events ruling); STATUS.md rewrite; commit + push docs.
