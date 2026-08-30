# Session handoff

**Read this first, before acting.** Then `CLAUDE.md`. Assume the next session has zero
memory of the last one — nothing survives except what is committed here.

### Where project knowledge lives

| File | Lifecycle | What it is for |
|---|---|---|
| `docs/STATUS.md` (this file) | **Rewritten** each session | Where the project stands, what is next, what is blocked |
| `docs/DECISIONS.md` | **Append-only — never rewrite** | Every decision and the reasoning behind it |
| `docs/superpowers/specs/` | Frozen once written | Architecture: `2026-08-29-surveyall-design.md`. Visual: `2026-08-30-surveyall-visual-design.md` |
| `docs/superpowers/plans/` | Executed | `2026-08-29-open-demo-survey-vertical.md` (11 tasks) and `2026-08-30-ux-round-2.md` — both **COMPLETE** |

### Conventions settled in practice

- **Pushing:** direct to `main` (owner's call); full-autonomy pushes authorized 2026-08-29.
- **pnpm:** `corepack pnpm <cmd>` from repo root (pinned `pnpm@9.15.0`; Node 20 here).
- **Commands:** `corepack pnpm typecheck | lint | test | build | db:generate | db:migrate`. CI runs all + migrations on ephemeral Postgres per push/PR.
- **Prod restart gotcha:** never `pkill -f "next start"` from a wrapper whose own command line contains that string — kill the pid from the pidfile or `pgrep -f next-server`.
- **End of session:** rewrite this file, append DECISIONS if decided, commit, push.

---

## Last updated: 2026-08-30 after the SCHEDULING vertical shipped (machine: alexander / Linux)

**State as of commit `7e42415` (= origin/main, CI pending-check at write time).
Plan `2026-08-30-scheduling-vertical.md` COMPLETE (5 tasks, each reviewed with
fix rounds).**

### NEW: Calendar team-match is live

Full When2Meet-style flow on the demo URL: create an event at `/events`
(date range + daily window + auto-detected timezone — window immutable after
creation), share `/e/<slug>`, participants join by name (cookie token identity,
90d), paint availability by dragging on a 30-min grid (viewer-local timezone
rendering), group heatmap (5-step indigo ramp) with tap-a-cell "who's free"
popovers. Events are open|closed (no draft); heatmap stays readable after close.
Demo event: `/e/tllahnv4`. 120 Vitest tests green (timezone/DST math included).
Three scheduling decisions logged in DECISIONS.md (tz anchoring, no-draft,
immutable window).

### Live demo — fully working

**https://dinner-comes-motorola-puerto.trycloudflare.com** (rotates if the tunnel
container restarts — `scripts/tunnel.sh` prints a fresh one).

Complete flows: authoring (create → questions → publish → share-copy-link/open →
results) and public respond (`/s/<slug>`, all 4 question types + optional name
field). Auth deliberately absent (owner decision); everything open, `author_id`
NULL.

**This session (owner-requested pair of features, both shipped + verified):**
- **Open button** next to Copy link in the share panel (`share-panel.tsx`) — a
  plain `<a target="_blank" rel="noopener">` at the same public path, works
  pre-hydration.
- **Respondent name setting** — author chooses per survey whether respondents are
  asked their name: `surveys.respondent_name` enum (`none`/`optional`/`required`,
  default `none`, migration 0003) + nullable `survey_responses.respondent_name`.
  Pure domain validator `lib/domain/surveys/respondent-name.ts` (14 new Vitest
  cases, TDD — failing tests written first). Editor select next to the theme
  picker; PATCH API + public GET expose the setting; respond page renders a name
  field above question 01 (required marker / pencil "Optional" hint) when the
  setting isn't `none`; `submitResponse` validates and stores it (422 via the
  existing `DomainError` → HTTP mapping); the editor results page shows a
  "Respondents" line (comma-separated names + "+ N unnamed") when the setting
  isn't `none` and there is at least one response. `getResults` extended
  additively with `respondents: string[]` and `respondentName`.
  Existing surveys default to `none` — verified unchanged behavior (the "What
  youd like for lunch" demo survey renders no name field, 200 through the
  tunnel). The "Team Lunch Preferences" demo survey was switched to `optional`
  after verification, deliberately, to demo the feature live to the owner; its
  5 existing responses predate the feature and so still show as unnamed on the
  results page ("+ 5 unnamed") until someone responds with a name.

**Review fix round 1 (same session):** code review on commit `89cf119` caught a
live privacy leak — `GET /api/v1/surveys/[id]/results` returned `getResults()`
unfiltered, exposing respondent names over an unauthenticated API regardless of
`show_results_to_respondents`; fixed by whitelisting that route's JSON to
`{ responseCount, results }` (the authoring results *page* still gets names via
the server-side `getResults()` call, unaffected). Also fixed
`validateRespondentName` throwing the wrong message ("name is too long…") for a
non-string name — now `'name must be text'` — with an added/updated test.

### Test/quality state

73 Vitest tests green (58 baseline + 15 new respondent-name domain tests, one
added in the fix round for the "name must be text" message); typecheck/lint/build
all green; verified end-to-end via curl against a local dev server on :3100
(required/optional/none settings, 422-on-missing-required, 201-with-name, DB row
contents, results-page rendering, editor UI) before redeploying prod. The four
throwaway surveys created for manual verification ("Name Test Required/Optional/
None" and "Where to go") were deleted from the demo DB in the fix round.

### Next work (clean slate)

1. Fast follow-ups parked by earlier reviews (still open, not touched this
   session): options-count cap on the authoring-UI textarea path; dead ternary in
   donut clamp; `lib/themes.ts` comment points at an untracked report (inline the
   contrast numbers); `theme` column enum narrowing; star arrow-keys follow
   reverse-visual DOM order (CSS technique tradeoff); malformed JSON → 500 not
   400; the public `/api/v1/public/surveys/[slug]/results` link is raw JSON, not
   a page.
2. **Scheduling domain** (When2Meet heatmap grid) — next big feature; modeled in
   architecture spec §3/§4.
3. **Auth** (Auth.js magic link + Google) — design stands; revisit two standing
   rulings when posture changes (CF-Connecting-IP trust; fully-open authoring).
4. **Real deploy** (home server, named tunnel/domain, SMTP, backups) — needs owner
   accounts/access (architecture spec §7).
5. Share link derives from `window.location.origin` client-side (`66fa71e`,
   unchanged this session).

### Standing environment notes

Serving: detached `next start` :3000 + `surveyall-tunnel` (cloudflared) +
`surveyall-db-1` (Postgres :5433, named volume). Stop: kill next-server pid,
`docker rm -f surveyall-tunnel`, `docker compose down`. Windows machine: repo still
inside OneDrive — move before any install there. `IP_HASH_SALT` should be set to a
real value in any non-demo deployment.
