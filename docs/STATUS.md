# Session handoff

**Read this first, before acting.** Then `CLAUDE.md`. Assume the next session has zero
memory of the last one — nothing survives except what is committed here.

### Where project knowledge lives

| File | Lifecycle | What it is for |
|---|---|---|
| `docs/STATUS.md` (this file) | **Rewritten** each session | Where the project stands, what is next, what is blocked |
| `docs/DECISIONS.md` | **Append-only — never rewrite** | Every decision and the reasoning behind it |
| `docs/superpowers/specs/` | Frozen once written | Architecture: `2026-08-29-surveyall-design.md`. Visual: `2026-08-30-surveyall-visual-design.md` |
| `docs/superpowers/plans/2026-08-29-open-demo-survey-vertical.md` | **COMPLETE** | The executed build plan (11 tasks + design pass) |

### Conventions settled in practice

- **Pushing:** direct to `main` (owner's call); full-autonomy pushes authorized 2026-08-29.
- **pnpm:** `corepack pnpm <cmd>` from repo root (pinned `pnpm@9.15.0`; Node 20 here).
- **Commands:** `corepack pnpm typecheck | lint | test | build | db:generate | db:migrate`.
  CI (GitHub Actions) runs all of these + migrations against ephemeral Postgres on every
  push/PR — green as of run 33310733337.
- **End of session:** rewrite this file, append DECISIONS if decided, commit, push.

---

## Last updated: 2026-08-30 end of build (machine: alexander / Linux)

**State as of commit `0c840e6` (= origin/main).** `git log 0c840e6..HEAD` shows anything newer.

### THE PLAN IS COMPLETE — the demo is live and finished

**https://dinner-comes-motorola-puerto.trycloudflare.com**

Everything works end-to-end through that URL: home/health, `/surveys` authoring
(create → questions → publish → results with tally bars), public respond page
`/s/<slug>` (all 4 question types), results visibility toggle, closed-survey states.
46→58 Vitest domain tests, CI green, final whole-branch review (most capable model)
passed with its fixes merged (input hardening: rating-range DoS bound, length caps
everywhere, required-multi_choice `[]` bypass, blank-prompt guard).

**Visual identity:** "Paper Ballot" (owner-approved 2026-08-30) — see the visual
spec. Tokens in `app/globals.css`, fonts via next/font (Bricolage Grotesque /
Public Sans / IBM Plex Mono). Signature: OMR fill-in marks on answer options.

**Auth is deliberately absent** (owner decision): everything open, `author_id` NULL.
Serving: detached `next start` :3000 + `surveyall-tunnel` cloudflared container +
`surveyall-db-1` Postgres. URL rotates if the tunnel restarts (`scripts/tunnel.sh`
prints a new one). Stop: `pkill -f "next start"`, `docker rm -f surveyall-tunnel`,
`docker compose down`.

### Next work (nothing in progress — clean slate)

1. **Fast follow-up (parked from final review):** cap options-per-question on the
   authoring-UI path (`parseOptions` in `app/(app)/surveys/actions.ts`) — API caps
   at 20, the UI textarea path doesn't. Two-line guard + inline error.
2. **Scheduling domain** (When2Meet grid) — next plan; spec §3/§4 of the
   architecture design already model it.
3. **Auth** (Auth.js magic link + Google) when the owner wants it — design stands.
4. **Real deploy** (home server, named tunnel/domain, SMTP, backups) — needs owner
   accounts/access (architecture spec §7 prerequisites).

### Standing rulings that depend on current posture (revisit when posture changes)

- Rate limiter trusts `CF-Connecting-IP` — valid only while serving is tunnel-only.
- Fully-open authoring — valid only for the throwaway demo.
Both get DECISIONS entries when auth/deploy changes the posture.

### Deferred minors (triaged by final review — all deliberately deferred)

Duplicated question Zod schema (2 route files) · STATUS_CHIP/qNumber duplicated in
UI files · list-page N+1 countResponses · results page double survey load ·
rate-limiter Map never fully evicts · zod flatten() deprecated · no ipHashFrom test ·
relative-path escape of the lib/db lint guard (package bans are airtight) ·
malformed JSON → 500 not 400 · respondent results links point at raw JSON ·
zero-option choice questions publishable · client_token cookie read but never set ·
IP_HASH_SALT missing → unsalted (set it in prod) · tally inner-loop O(range×n)
(range now ≤10) · Windows-machine OneDrive relocation still pending before any
install there.
