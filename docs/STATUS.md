# Session handoff

Updated at the end of every session. Assume the next session has zero memory of this
one. Read this and `CLAUDE.md` before acting.

---

## Last updated: 2026-08-27 (design session, machine: asorkin / Windows)

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
