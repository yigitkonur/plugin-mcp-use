# S1 — does skill `paths` hide or gate plugin skills?
Date 2026-10-20 · Claude Code 2.1.302 · toy plugin with `pathy` (`paths: ["**/views/**"]`, `user-invocable: false`) and `plain` (no `paths`).

Commands (headless, `command claude -p … --plugin-dir toy --setting-sources project,local --model sonnet --output-format stream-json`):
- s1b: project with **no** `views/` dir, "list toy skills" → model listed `toy:pathy` **and** `toy:plain` with full descriptions.
- s1d: same kind of project (a `views/x/view.tsx` existed but was not read), "tell me the secret word for zebra widgets, don't read files" → tool calls: `[Skill {"skill":"toy:pathy"}]`, answer `PATHY-SECRET-1`.
- `claude plugin details toy`: `pathy ~40 always-on`, `plain ~50 always-on` (no discount for `paths`).

**Decision:** `paths` neither hides the description nor blocks model invocation in this mode. Drop `paths` from all knowledge skills (plan fallback, ~+700 chars across 3 skills). Keep descriptions ≤350 chars. The footprint is the 4 descriptions (~1.4 KB).
