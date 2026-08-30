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

## Last updated: 2026-08-30 after UX Round 2 (machine: alexander / Linux)

**State as of commit `1a2d3a5` (= origin/main, CI green).**

### Live demo — fully working, redesigned twice

**https://dinner-comes-motorola-puerto.trycloudflare.com** (rotates if the tunnel
container restarts — `scripts/tunnel.sh` prints a fresh one).

Complete flows: authoring (create → questions → publish → share-copy-link →
results) and public respond (`/s/<slug>`, all 4 question types). Auth deliberately
absent (owner decision); everything open, `author_id` NULL.

**UX Round 2 (owner punch list, all shipped + reviewed):** rating config shown only
for rating type; star rating input + star result summaries; add-question collapsed
behind a button; publish at the editor bottom with a copy-link share panel; results
as SVG donut charts (validated palette, honest zeros, multi-choice selection-based
percentages; free text stays a list); **8 survey themes** (classic/food/business/
leisure/celebration/education/health/tech — accent + subtle SVG background on public
pages), theme picker in the editor, `surveys.theme` column (migration 0002).
Demo lunch survey is set to the food theme.

Final integration review caught and fixed a prod-down bug: closed-survey editor
500ed (client-module helper called in server render) — fixed in `1a2d3a5`, closed
editors verified 200 through the tunnel.

### Test/quality state

58 Vitest domain tests green; CI green; every task went through implement → review
→ fix-loop; two whole-branch reviews (2026-08-30) both closed out with fixes merged.

### Next work (clean slate)

1. Fast follow-ups parked by reviews: options-count cap on the authoring-UI
   textarea path; dead ternary in donut clamp; `lib/themes.ts` comment points at an
   untracked report (inline the contrast numbers); `theme` column enum narrowing;
   star arrow-keys follow reverse-visual DOM order (CSS technique tradeoff);
   malformed JSON → 500 not 400; respondent results links show raw JSON (a public
   results page would fix it and complete the design language).
2. **Scheduling domain** (When2Meet heatmap grid) — next big feature; modeled in
   architecture spec §3/§4.
3. **Auth** (Auth.js magic link + Google) — design stands; revisit two standing
   rulings when posture changes (CF-Connecting-IP trust; fully-open authoring).
4. **Real deploy** (home server, named tunnel/domain, SMTP, backups) — needs owner
   accounts/access (architecture spec §7).
5. Owner should tap **Copy link** once on the phone — clipboard write unverifiable
   from the sandbox (state machine + fallback reviewed correct).

### Standing environment notes

Serving: detached `next start` :3000 + `surveyall-tunnel` (cloudflared) +
`surveyall-db-1` (Postgres :5433, named volume). Stop: kill next-server pid,
`docker rm -f surveyall-tunnel`, `docker compose down`. Windows machine: repo still
inside OneDrive — move before any install there. `IP_HASH_SALT` should be set to a
real value in any non-demo deployment.
