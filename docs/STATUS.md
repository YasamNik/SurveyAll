# Session handoff

**Read this first, before acting.** Then `CLAUDE.md`. Assume the next session has zero
memory of the last one — nothing survives except what is committed here.

### Where project knowledge lives

| File | Lifecycle | What it is for |
|---|---|---|
| `docs/STATUS.md` (this file) | **Rewritten** each session | Where the project stands, what is next, what is blocked |
| `docs/DECISIONS.md` | **Append-only — never rewrite** | Every decision and the reasoning behind it. Reversing a decision means adding a new entry that supersedes the old one, not editing it |
| `docs/superpowers/specs/YYYY-MM-DD-*.md` | Frozen once written | The design itself. A revised design is a new dated file, not an edit |

Conversation transcripts, `.remember/`, and machine-local Claude memory do **not**
travel between machines. If it is not committed, the next session cannot see it.
`.remember/` is intentionally left untracked: it self-ignores, holds machine-local
runtime state (PIDs, session UUIDs, logs), and its notes are a lossy duplicate of this
file.

### Conventions settled in practice

- **Pushing:** direct to `main` is fine for this project (owner's call, 2026-08-27),
  despite the branch + PR default described in `CLAUDE.md`. Still confirm before
  pushing anything beyond documentation.
- **End of session:** rewrite this file, append to `DECISIONS.md` if anything was
  decided, commit, push.

---

## Last updated: 2026-08-27 (design session, machine: asorkin / Windows)

**State as of commit `3a95d44`.** Run `git log 3a95d44..HEAD` to see anything that
landed after this entry was written.

### Where the project stands

Still zero application code. What changed this session is that the design now exists
and is agreed: audience, product requirements, stack, data model, API surface, and
the contents of the first build cycle.

Tracked files: `README.md`, `LICENSE`, `.gitignore`, `CLAUDE.md`, and the three
documents added this session.

### What happened this session

A brainstorming session covering the whole product at a high level. Every decision
reached, with its reasoning, is in `docs/DECISIONS.md`; the full design is in
`docs/superpowers/specs/2026-08-27-surveyall-design.md`.

The short version:

- **Audience:** public / broad distribution. Anonymous respondents at scale;
  scheduling is the organiser's own tool.
- **Stack:** Next.js App Router on Vercel, Supabase Postgres, Supabase Auth with
  Google OAuth + email magic link.
- **Shape:** one layered app. `lib/domain/**` is pure TypeScript; Server Components
  and `/api/v1` route handlers are two thin adapters over it, with the boundary
  enforced by an ESLint rule in CI. Not a monorepo.
- **Security:** server-mediated access, RLS as a tested second wall.
- **Identity:** anonymous respondents allowed; signing in earns participation
  history, results access, and a real one-response-per-survey DB constraint.
- **Two separate domains:** surveys, and a When2Meet-style painted availability grid
  for scheduling. They are not one engine.
- **Data model:** nine tables, specified in the design doc.

### Verified this session

Nothing executable — this session produced documents only. No code was written, no
dependency installed, no external service configured. Every "verified" line in the
design doc describes a check to run during the foundation cycle, not one already run.

### What is unfinished

The design was approved but the **spec has not yet been reviewed by the owner**, and
**no implementation plan exists**. Per the brainstorming workflow, the sequence from
here is: owner reviews the spec → then the writing-plans skill produces an
implementation plan → then implementation.

### Next step for whoever picks this up

1. Read `docs/superpowers/specs/2026-08-27-surveyall-design.md` and confirm it still
   reflects what you want, or note changes.
2. Once it is confirmed, generate the implementation plan for the foundation cycle
   (six deliverables, section 5 of the design doc).
3. Only then scaffold.

### Blockers and things to do before scaffolding

- **Move the repo out of OneDrive.** The owner has acknowledged this and intends to
  relocate it. OneDrive will sync `node_modules` and `.next` regardless of
  `.gitignore` — tens of thousands of files, constant churn, file-lock failures
  during install. Do this before `pnpm install` ever runs.
- **External accounts not yet created:** no Supabase project, no Vercel project, no
  Google OAuth client. All three are needed for foundation deliverables 2 and 5.
- **Google OAuth on preview deploys** needs the stable Supabase callback URL rather
  than per-PR Vercel hostnames. Details in the design doc, section 7.

### Open questions

None blocking. Deferred product items are listed as non-goals in the design doc.

## Demo serving (2026-08-29)

The app runs via `scripts/serve.sh` (build + `next start` on :3000) and is exposed
publicly via `scripts/tunnel.sh` (a Cloudflare quick tunnel, Docker container
`surveyall-tunnel`). The tunnel URL changes on restart — re-run `scripts/tunnel.sh`
after any restart of the `cloudflared` container and re-share the new URL.

To stop the demo:
- **App:** `kill "$(cat /tmp/claude-1000/-home-alexander-Documents-GitHub-SurveyAll/f4b60338-5773-49f7-9b7b-0b719f8ec9e3/scratchpad/surveyall-app.pid)"`
  (that pidfile path is machine-local to the session that started it; if it's gone
  or on another machine, fall back to `pkill -f "next start"`).
- **Tunnel:** `docker rm -f surveyall-tunnel`.
- **DB:** `docker compose down`.
