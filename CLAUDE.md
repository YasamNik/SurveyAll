# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What we are building

**SurveyAll** — a survey web and mobile app, with calendar scheduling for a group of people
(per `README.md`). Two capability areas shape the architecture:

- **Surveys** — authoring, distribution to a group, response collection and aggregation.
- **Calendar scheduling** — group availability and meeting-time selection.

Both a web client and a mobile client are planned against a shared backend/API, so survey and
scheduling domain logic belongs in a shared layer rather than duplicated per client.

## Repository state

Greenfield scaffold. As of the `Initial commit` (b4ca210) the only tracked files are `README.md`,
`LICENSE` (Apache 2.0), and `.gitignore`. There is no application code, no package manifest, no
build/test tooling, and no CI configuration yet.

**Implication:** there are no build, lint, or test commands to run — do not guess at them. When the
project is scaffolded, replace this section with the real commands (install, dev server, build,
lint, full test run, and single-test invocation).

The stack is not decided. `.gitignore` is GitHub's Node template (its Next.js/Nuxt/Vite/SvelteKit/
Gatsby/Firebase/Serverless entries ship by default and pin nothing), so JavaScript/TypeScript is
likely but unconfirmed — treat it as a hint and confirm with the user before scaffolding.

`.env` and `.env.*` are ignored except `.env.example`; add new configuration keys to `.env.example`
so they stay discoverable.

## Cross-system development — session handoff

Development happens on **two different systems**, so no state may live only in one machine's local
session. Anything a future session needs must be written down and committed.

- **The git remote is the source of truth.** `origin` is
  `https://github.com/YasamNik/SurveyAll.git`. Pull at the start of a session; commit and push
  before ending one, so the other system starts from current state.
- **The working copy is inside a OneDrive folder.** Do not rely on OneDrive to move work between
  systems — it can produce sync conflicts in `.git`. Sync through git, not the filesystem.
- **Persist context in the repo, not in machine-local Claude memory.** Local memory directories do
  not travel between systems. Durable items go in committed files:
  - Architecture and stack decisions (and the reasoning) → `docs/DECISIONS.md`. Append-only:
    reverse a decision by adding an entry that supersedes the old one, never by editing it.
  - The design being built against → `docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md`.
    A revised design is a new dated file, not an edit to the old one.
  - Commands, once tooling exists → the Repository state section above.
  - Work in progress, open questions, and the next step → `docs/STATUS.md`, rewritten at the
    end of each session.
- **Start of session:** read this file and `docs/STATUS.md` before acting; it names the commit
  it was written at, so `git log <that-commit>..HEAD` tells you what the other system did since.
- **End of session:** record what changed, what was verified, what is unfinished, and what decision
  is pending. Assume the next session has zero memory of this one.
- `origin` is not under the local git user's (`asorkin@techinsights.com`) account. Assume
  contributions land via branch + pull request rather than a direct push to `main`, and confirm
  before pushing.

# Development guidance

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.
