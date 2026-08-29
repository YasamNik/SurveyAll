# Architecture Decisions

Decisions with the reasoning that produced them. Append new entries; do not rewrite
history. When a decision is reversed, add a new entry that supersedes the old one and
mark the old one superseded.

Full design context for everything below:
[`docs/superpowers/specs/2026-08-27-surveyall-design.md`](superpowers/specs/2026-08-27-surveyall-design.md).

---

## 2026-08-27 — Audience: public / broad distribution

Surveys are published to anyone with a link; respondents need no account. Calendar
scheduling is a companion capability the organiser uses for their own group.

**Why:** chosen over private-group, workplace, and personal-project framings. It sets
the hardest constraint in the product — the respondent path must work for a total
stranger on a phone with zero friction — and everything downstream (identity, abuse
control, privacy) follows from it.

---

## 2026-08-27 — v1 is a foundation cycle, plus a thin vertical slice

The first cycle ships auth, schema and migrations, CI, and Vercel deploys — no
user-facing feature. Added to that scope: one trivial end-to-end slice
(`/api/v1/health` plus one page) that exercises both adapters.

**Why:** the foundation was the owner's explicit choice. The slice was added because a
foundation with no feature through it can be wrong without anyone noticing; the slice
is proof of wiring, not a feature.

---

## 2026-08-27 — Web now, native later

Responsive web only for the foreseeable cycles. The API and domain layer stay
client-agnostic so a native client can be added without rework.

**Why:** chosen over React Native/Expo now, PWA-only, and Flutter/native. Defers the
mobile decision while committing to the shared-layer discipline that keeps it open.
The cost of that discipline is small; the cost of retrofitting it is not.

---

## 2026-08-27 — Next.js (App Router) on Vercel + Supabase Postgres

One TypeScript project. Route handlers under `/api/v1` expose a plain HTTP/JSON API;
the web UI is Server Components over the same domain layer. Supabase supplies
Postgres, Auth, and storage.

**Why:** fastest path to a deployed, low-ops product for a solo two-machine project.
Accepted costs: Vercel and Supabase lock-in, and RLS as a skill to learn.

---

## 2026-08-27 — Auth: Supabase Auth, Google OAuth + email magic link

Google OAuth is the primary sign-in; email magic link is the fallback for people
without a Google account. Authors authenticate; respondents need not.

**Why:** both are built into Supabase Auth. Magic link avoids building password reset
flows for little gain.

---

## 2026-08-27 — Repo shape: layered single app, not a monorepo

`lib/domain/**` is pure TypeScript importing nothing from `next/*`, `react`, or
`@supabase/*`. Server Components and `/api/v1` route handlers are two thin adapters
above it. Enforced by an ESLint `no-restricted-imports` rule in CI.

**Why:** the boundary that matters is domain-versus-transport, and a directory plus a
lint rule buys that at a fraction of a Turborepo's cost on this project. `git mv
lib/domain packages/domain` remains available if a native client becomes imminent —
this door does not close.

---

## 2026-08-27 — Security: server-mediated, RLS as defence in depth

All data access goes through the server via the domain layer. RLS policies are still
written and tested, as a second wall rather than the only one.

**Why:** the rejected alternative was handing the anon key to the public with RLS as
the entire authorisation model. That fails when respondents are anonymous — rate
limiting, dedupe, and response validation are server concerns and need a server.
Server mediation also gives a future native client one contract instead of two access
patterns to secure.

**Consequence:** the service-role key must never reach the client bundle.

---

## 2026-08-27 — Identity is a spectrum, not anonymous-versus-not

Respondents may answer anonymously or signed in. Signing in links the response to the
account, puts it in a participation history, grants results access, and makes
one-response-per-survey a real Postgres constraint. Anonymous responses get none of
that and only best-effort duplicate control.

**Why:** supersedes an earlier framing in this same session where respondents were
strictly anonymous with no user FK. The spectrum creates an incentive to sign in
rather than a wall, and yields a subset of responses with genuine integrity.

**Consequence:** `survey_responses.user_id` is nullable; RLS handles both shapes.

---

## 2026-08-27 — Surveys and scheduling are separate domains

Two domain modules sharing auth, the public-link mechanism, participation history,
and abuse controls — not one engine with scheduling as a question type.

**Why:** an earlier lean toward unifying them assumed scheduling meant discrete
yes/no slots. It does not: it is a When2Meet-style painted availability grid, where a
response is N cells, the aggregate is a per-cell density map, and the input is a drag
gesture. Unifying would require a "question type" that ignores most of what a
question is.

---

## 2026-08-27 — Survey options are a table, not JSON

`question_options` rows with stable ids. The authoring API accepts a whole question as
one JSON payload and reconciles it server-side in a transaction.

**Why:** an option needs stable identity either way — storing option *text* in an
answer means a rename splits the tally, storing an *index* means a reorder rewrites
answers. Given ids are required, a table gives tallies as a plain `GROUP BY` with a
`LEFT JOIN` (zero-count options for free) and a foreign key protecting answers. The
whole-question diff keeps client ergonomics JSON-shaped. `jsonb` is still used where
nothing is joined or grouped: `questions.config`.

---

## 2026-08-27 — Scheduling specifics

- Grid granularity fixed at 30 minutes; not stored, so it can become a column later
  without invalidating rows.
- Cells attribute to people — hover or tap shows who is available. Anonymous
  participants therefore supply a display name.
- The author is just another participant row, so there is no privileged second write
  path.
- Slots stored as UTC `timestamptz`, always rendered in the viewer's local zone.
  `author_timezone` is display reference only and never affects storage.
- Availability writes replace the whole painted set — one idempotent write per paint
  gesture instead of a stream of cell deltas.
- Anonymous participants return via an opaque token in an httpOnly cookie scoped to
  the event. No cookie means a second participant row, as in When2Meet.

---

## 2026-08-29 — Postgres in Docker instead of Supabase; self-hosting first

**Supersedes** the Supabase half of "Next.js (App Router) on Vercel + Supabase
Postgres" (2026-08-27) and changes the auth mechanism of "Auth: Supabase Auth"
(2026-08-27); the chosen providers (Google OAuth + magic link) stand.

The database is Postgres running in a Docker container defined in the repo's
`docker-compose.yml`, with the schema as plain SQL migrations. The app reads the
database location from a single `DATABASE_URL` env var and knows nothing else about
where Postgres lives — local container, the owner's home server, or a managed host
are interchangeable by changing that one value. Auth moves from Supabase Auth to
Auth.js (Google OAuth + email magic link, same providers as before). Hosting target:
the owner's local server running the same docker-compose (app + Postgres), exposed
via a free Cloudflare Tunnel; Cloudflare Workers (via OpenNext) remains an option
for the app later, with the DB then living elsewhere.

**Why:** a fourth Supabase project is not free on the owner's plan, and this data is
not critical enough to justify the cost. A compose file travels with the repo across
the two dev machines and deploys identically to the server, at $0 hosting cost.
Decided 2026-08-29 with the owner working remotely, without access to the Supabase
dashboard or Google Cloud Console — this path needs neither.

**Consequences:**
- RLS is no longer a second wall; server mediation (already the primary model) is
  the authorisation model. The RLS entry's server-mediated design stands unchanged.
- Vercel-specific assumptions in the design doc (preview deploys, the Google OAuth
  callback workaround in section 7) no longer apply.
- The Google OAuth client is still created later in Google Cloud Console; until
  then Auth.js magic link (or no auth) suffices for development.

---

## 2026-08-29 — Drizzle owns schema, migrations, and types

Schema declared in TypeScript (`lib/db/schema.ts`); `drizzle-kit` generates SQL
migrations committed to git; types derive from the schema; Drizzle is also the query
layer. Migrations run programmatically at app start-up in production, via script
locally.

**Why:** the Supabase CLI had implicitly owned migrations and type generation — the
2026-08-29 stack change left them unowned. Drizzle resolves all three with one tool
and has a first-party Auth.js adapter. Rejected: plain SQL + `pg` (no types),
Kysely + codegen (two tools for the same result).

---

## 2026-08-29 — Auth.js tables replace `profiles`; DB sessions; Mailpit for dev mail

The Auth.js Drizzle adapter's `users`/`accounts`/`sessions`/`verification_tokens`
tables come in; `profiles` is dropped and domain FKs point at `users.id` (it already
carries name/email/image — no trigger needed). Sessions are database-backed. Magic
link sends through Mailpit (a compose container) in dev and CI; the production
provider (e.g. Resend free tier) is chosen at deploy time and listed as a deploy
prerequisite.

**Why:** magic link needs a mailer to work at all — Supabase's built-in one is gone.
`profiles` next to Auth.js `users` would be a second copy of the same row. DB
sessions are simpler and revocable on a single long-running server; JWT buys nothing
here.

---

## 2026-08-29 — Ops floor: nightly pg_dump off-machine; Postgres never exposed

Nightly `pg_dump`, short retention, copied off the server via rclone. Postgres gets
no published port in production — only the app reaches it on the compose network,
and only `cloudflared` faces the internet. One shared `pg.Pool`; no pgbouncer.

**Why:** Supabase's backups are gone and a home server has none by default; the data
is non-critical, so the floor is minimal — but written down deliberately, not
omitted. The full revised design is
[`2026-08-29-surveyall-design.md`](superpowers/specs/2026-08-29-surveyall-design.md).

---

## 2026-08-29 — Auth deferred; open demo via quick tunnel now

Owner's call: build and publicly deliver the survey vertical **without auth** —
authoring UI open to anyone with the URL, `author_id` NULL everywhere — and serve it
ASAP from the Linux dev machine through a Cloudflare **quick tunnel**
(`trycloudflare.com`, random URL, no domain or account needed). The Auth.js design
stands unchanged; only its activation moves later. The named-tunnel/domain deploy on
the home server remains the production target.

**Why:** the owner is away from the machines holding Google/DNS/server access and
wants something usable now. Data is throwaway; a random unlisted URL is acceptable
exposure for an open demo. Quick tunnels need zero prerequisites.

**Consequences:** the URL changes if the tunnel restarts; one-response-per-user
constraints are dormant until auth lands; plan:
[`plans/2026-08-29-open-demo-survey-vertical.md`](superpowers/plans/2026-08-29-open-demo-survey-vertical.md).
