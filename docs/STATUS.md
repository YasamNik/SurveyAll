# Session handoff

**Read this first, before acting.** Then `CLAUDE.md`. Assume the next session has zero
memory of the last one — nothing survives except what is committed here.

### Where project knowledge lives

| File | Lifecycle | What it is for |
|---|---|---|
| `docs/STATUS.md` (this file) | **Rewritten** each session | Where the project stands, what is next, what is blocked |
| `docs/DECISIONS.md` | **Append-only — never rewrite** | Every decision and the reasoning behind it |
| `docs/superpowers/specs/YYYY-MM-DD-*.md` | Frozen once written | The design. Current: `2026-08-29-surveyall-design.md` |
| `docs/superpowers/plans/2026-08-29-open-demo-survey-vertical.md` | The active implementation plan | 11 tasks; execution state below |

### Conventions settled in practice

- **Pushing:** direct to `main` is fine (owner's call). This session the owner
  additionally authorized full-autonomy code pushes.
- **pnpm:** invoke as `corepack pnpm <cmd>` from the repo root (pinned `pnpm@9.15.0`
  in package.json; corepack's default pnpm 11 needs Node ≥22, this box has Node 20).
- **End of session:** rewrite this file, append DECISIONS if decided, commit, push.

---

## Last updated: 2026-08-29 end of session (machine: alexander / Linux)

**State as of commit `a8797ea`.** Run `git log a8797ea..HEAD` to see anything newer.

### THE DEMO IS LIVE

**https://dinner-comes-motorola-puerto.trycloudflare.com** — serving from this Linux
machine: detached `next start` on :3000 (production build at commit `813f2df`),
`surveyall-tunnel` Docker container (Cloudflare quick tunnel), `surveyall-db-1`
Postgres container. Survives the Claude session; dies if the machine reboots or the
tunnel container restarts (URL rotates — rerun `scripts/tunnel.sh`, re-share).
Start/stop instructions further down in this file. **Auth is deliberately absent**
(owner decision, DECISIONS 2026-08-29): everything is open, `author_id` is NULL.

What the live URL serves right now: home/health page, `/surveys` authoring UI
(create → edit questions → publish → results), full `/api/v1` authoring + public
API. The public respond page `/s/<slug>` is committed (WIP) but **not yet in the
running production build**.

### Execution state of the plan (11 tasks, subagent-driven)

Tasks 1–9 **complete, reviewed, green, pushed**: scaffold + ESLint domain boundary;
Docker Postgres + Drizzle (+`"type":"module"`); health slice; tunnel scripts;
survey schema (6 tables); survey domain logic (46 Vitest tests); authoring API;
public respond/results API (rate-limited, ZodError→400); authoring UI.

Task 10 (public respond page) **interrupted mid-verification** — session ended.
Code committed as WIP (`a8797ea`): `app/s/[slug]/page.tsx`, `respond-form.tsx`,
`done/page.tsx`. Typechecks; implementer had passed local checks up through
404-path testing. **Still owed:** task review + fix loop, production rebuild +
detached restart, through-tunnel verification (GET /s/<slug> 200, POST response
201, results reflect it). The WIP commit is pushed.

Task 11 (GitHub Actions CI) **not started** — full workflow YAML is in the plan.

Then: final whole-branch review (most capable model) per the SDD process, and the
deferred-minors triage below.

### How to resume (next session, either machine)

1. Read this file, then the plan file. On THIS machine the SDD ledger survives at
   `.superpowers/sdd/2026-08-29-open-demo-survey-vertical/progress.md` (git-ignored)
   with per-task rulings; on the other machine it won't exist — this section is the
   digest.
2. Resume at Task 10's remaining steps (review → fix → prod rebuild/restart →
   through-tunnel verify), then Task 11, then final review.
3. **On the Windows machine: do NOT `pnpm install` or `docker compose up` until the
   repo is moved out of OneDrive** (still pending, and the Postgres named-volume rule
   in the design §7 applies). The demo can only serve from the Linux machine anyway.

### Rulings made this session (owner should skim; each is cheap to reverse)

- Postgres-in-Docker/self-host decisions, auth deferral: in DECISIONS.md (read it).
- ZodError → HTTP 400 in `lib/api/errors.ts` (client errors are not 500s).
- Duplicate multi_choice option ids → 422 INVALID_ANSWER (was a public 500).
- Rate-limiter trusts `CF-Connecting-IP`; spoofable only via direct LAN access —
  accepted for the open demo (parked).
- Results-visibility toggle stays usable after a survey closes (spec says results
  remain readable post-close; plan's "closed = read-only" read down to editor fields).
- Publish non-draft → SURVEY_CLOSED (409); publish with zero questions →
  INVALID_ANSWER (422). Slug minting: 3 attempts on collision.
- `tunnel.sh` uses a bounded 60s retry loop, not the plan's literal `sleep 5`.

### Deferred minors (for the final review to triage)

Duplicated question Zod schema in two route files; list-page N+1 `countResponses`;
results page double-loads survey; rate-limiter Map never fully evicts keys;
`clientToken` length unbounded; zod `flatten()` deprecated; no `ipHashFrom` unit
test; eslint config quote-style mix; tally rating-bucket inner loop O(range×n);
TOCTOU on status guards (accepted for single container).

### Demo serving — start/stop (Linux machine)

- **Start:** `docker compose up -d db` → `scripts/serve.sh` (foreground; to detach:
  `corepack pnpm build` then `setsid nohup corepack pnpm start > /tmp/surveyall-app.log 2>&1 &`)
  → `scripts/tunnel.sh` (prints the public URL; rotates each run).
- **Stop:** kill the `next start` process (`pkill -f "next start"`),
  `docker rm -f surveyall-tunnel`, `docker compose down`.

### Blockers / needs owner

- Production deploy proper (home server, named tunnel/domain, prod SMTP, backups)
  still needs the accounts/access listed in design §7 — untouched this session.
- Scheduling domain: not started; next plan after this one finishes.
