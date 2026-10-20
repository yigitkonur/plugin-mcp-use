---
name: migrate
description: Port a TypeScript MCP server built on the official MCP SDK (v1 or v2, with or without ext-apps or OpenAI Apps SDK widgets) to mcp-use, proving parity with before and after protocol snapshots.
argument-hint: "[--stdio \"<command>\"] [--url <http://.../mcp>]"
disable-model-invocation: true
---

# /mcp-use:migrate

Arguments: `$ARGUMENTS`. `--stdio "<command>"` or `--url` tells the probe how to start or reach the **old** server; without either, find it in `package.json` scripts and ask. Scope: a Node/TypeScript project on the official MCP SDK, or an mcp-use v1 server (then read `references/mcp-use-v1-to-v2.md` instead of `official-sdk.md`). Other frameworks are not covered: say so and stop. Read `references/method.md` first; it has the order, the questions and the stop conditions.

1. **Scope.** `mcp-use-detect --json`. Continue for scenario `MIGRATE` or `LEGACY_V1`. For `ADD_APPS` and later scenarios say the server is already on mcp-use and name the right command.
2. **Survey.** For `LEGACY_V1` (an mcp-use v1 server) skip the surveyor: read the server yourself and follow `references/mcp-use-v1-to-v2.md`. Otherwise delegate to the `server-surveyor` agent (project root). It returns the inventory JSON (`data/schemas/survey.schema.json`). Show a 6-line summary: framework and version, transport, tools/resources/prompts counts, auth, state, UI, zod version.
3. **Decide with the user** (one AskUserQuestion, up to four questions): in place or a new directory; transport (mcp-use serves HTTP only: a stdio server's clients must switch to a URL); auth plan; widgets now or later. Do not start porting before the answers.
4. **Baseline.** If `node_modules` is missing, install the project's dependencies with its own package manager first. Write `migration-calls.json` with sample calls for **read-only** tools only (`readOnlyHint: true` or clearly no side effects; never call a tool that writes unless the user says so). Run the old server through the probe and keep the snapshot: `mcp-use-probe --stdio "<cmd>" --cwd . --calls migration-calls.json --snapshot .mcp-use-plugin/migration/before.json` (or `--url`). A failure here stops the migration: the baseline must exist.
5. **Port** following `references/official-sdk.md`, in this order: zod >= 4.2.0 and the `mcp-use` dependency, server shell, tools one at a time, resources and templates, prompts, auth, state, UI last. Run `mcp-use typecheck` after each step; the edit guard will nudge on stack rules.
6. **Compare.** `mcp-use dev --no-open --no-inspector --port <p>`, then `mcp-use-probe --url http://localhost:<p>/mcp --calls migration-calls.json --snapshot .mcp-use-plugin/migration/after.json` and `mcp-use-probe --diff .mcp-use-plugin/migration/before.json .mcp-use-plugin/migration/after.json`. Classify every line with `references/parity.md`. Unintended differences are bugs: fix and re-run until the diff is empty or every line is intended.
7. **Clean up** only after parity: remove the old SDK dependencies and transport glue, change scripts to `mcp-use dev/build/start`, update the README and client configs (`command` entry becomes a URL). Run the project's own tests if it has any, and report their result as is.
8. **Verify.** `/mcp-use:verify` rungs 1 to 4 and `mcp-use-scan --json`. If the server had widgets, port them (`official-sdk.md`, Widgets) and verify every view as `/mcp-use:apps` does: `mcp-use screenshot --mcp <url> --tool <name> <args> --theme light --delay 1500 --output <png>` and again with `--theme dark`, then open both PNGs and fix any text that is unreadable in either theme (`${CLAUDE_PLUGIN_ROOT}/skills/mcp-apps/references/display-and-state.md`, Theme). A card that styles only one theme fails this check.
Process hygiene: start the old and the new server in the background, keep each process id, and stop them with `kill <pid>` (never `pkill -f` with a pattern broader than your own port). Leave no listener behind.
9. **Report** a ledger: each tool/resource/prompt, its parity result, the intended differences with reasons, what was removed, what remains OPEN or UNVERIFIED. Nothing is committed unless the user asks.
