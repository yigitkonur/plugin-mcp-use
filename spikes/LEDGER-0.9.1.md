# Verification ledger for 0.9.1

0.9.1 is the result of a quality-control pass over 0.9.0 (macOS, Node 26.5.0, Claude Code 2.1.304, mcp-use 2.11.0). The pass re-read every skill, agent, hook, manifest and the 0.9.0 ledger, compared all 62 third-party review comments on PR #1 with the tree, and ran the engines on bad input. Every row below was run for real; "before" means the 0.9.0 tree (`4ac5e8b`), "after" means the final tree of this release. Sessions are headless `claude -p --plugin-dir <repo> --model sonnet` runs on fresh fixture copies, and the maintainer re-ran the checks on each session's output.

| # | Row | Ran | Before (0.9.0) | After (0.9.1) |
|---|---|---|---|---|
| 0 | Goal | this ledger | 15 broken doc references, engines that report "clean" on bad input, F16 and p-ar depending on ignored files | all fixed, each with a test that fails on the old code |
| 1 | Fresh clone | `git clone -b qc-0.9.1`, then `node --test tests/*.test.mjs` | `tests/detect.test.mjs` (new) in a clone of 0.9.0: F16 detected as `HAS_VIEWS` instead of `ADD_HOST`, 16 of 18 pass | 201 tests, 0 fail, 0 skipped (the probe tests need the fixture workspaces that `typecheck-fixtures.sh` and `migration-workspace.sh` install, and skip without them; they were installed here, and CI installs them first) |
| 2 | Gates | `validate.mjs`; `typecheck-fixtures.sh`; `migration-workspace.sh --check`; `claude plugin validate --strict .` | | `validate: ok`; 32 examples compile, 10 bad ones rejected; SDK snippets, F02, F03, F11 compile; `✔ Validation passed` |
| 3 | Bad input | 13 commands (`scan --file nope.ts`, `scan --host chatpgt`, `scan --dir /nonexistent`, `scan --bogus`, `lint <dir>`, `lint --policy nope.json`, `lint --bogus`, `probe --url --json`, `probe --diff a.json`, `probe --host bogus` (server unreachable), `detect --preflight --dir <file>`, `detect --dir /nonexistent`, `detect --bogus`) | exit 3 for 1 of 13 (with a Node path error); exit 0 for 7 (a clean-looking result), exit 1 for 3 (two of them raw stack traces), exit 5 for 2 | exit 3 for 13 of 13, each with a one-line message (an envelope under `--json`) |
| 4 | No orphan server | mock stdio server; `probe --stdio … --host bogus`; `probe --stdio … --snapshot /dev/null/x/s.json` | the server was started before `--host` was checked and left running | `--host bogus` exits 3 and never starts it; the failed run exits 3 and the server pid is gone |
| 5 | Rule and diff gaps | `scan --host chatgpt` on a tool with `readOnlyHint: "yes", destructiveHint: null`; `probe --diff` on two snapshots that differ in a failing `resources/list` | scan: 0 findings; diff: "snapshots are equal", exit 0 | scan: `ERROR CG-T01b index.ts:4`, exit 2; diff: `ADDED problem resources/list: Internal error` plus a note for the server change, exit 1. Re-diffing the recorded F02, F03 and F11 migration snapshots gives the same differences as before, plus the server note where the transport changed |
| 6 | Regression | scan F15, F14, F16; detect F14, F15, F16; session-detect hook on C1–C8 | F15 13/15/8, F14 0/0/1, F16 0/0/0; `IMPROVE_HOST`, `LEGACY_V1`, `ADD_HOST` | unchanged; hook output 0 bytes on all eight controls |
| 7 | Doc references | `validate.mjs` on a clone with `` `references/official-sdk.md` `` appended to README | 15 broken references (12 bare cross-skill paths, `archestra-app` → `references/route-b-sdk.md`, README `references/official-sdk.md` and `spikes/S7`) | `FAIL README.md:72: \`references/official-sdk.md\` does not exist`, exit 1; the clean clone: `validate: ok`, exit 0 |
| 8 | Headless sessions | see the table below | | all pass |
| 9 | Release | see the release notes | | |

## Sessions (row 8)
Run on the branch before the version bump (the bump changes only manifests); outputs re-checked by the maintainer.

| Session | Prompt | Saw |
|---|---|---|
| F14 brief | "Reply with just the word: ready." | SessionStart `additionalContext` 429 chars |
| Python control | same | `stdout_len 0` |
| F15 guard | three edits | nudges of 455, 476 and 300 chars, no rule repeated |
| F14 clean edit | one edit | `stdout_len 0` |
| `/mcp-use:start` F14 | | ran `mcp-use-detect --json`, reported `IMPROVE_HOST` with next actions |
| `/mcp-use:start` Python | | scope notice, edited nothing |
| `/mcp-use:host chatgpt audit` F15 | | the `host-reviewer` agent ran; scan 13/15/8 plus 8 manual findings = 44 (15/18/11). The seeded `server.settings` crashes `mcp-use dev`, so no probe (as in 0.9.0) |
| `/mcp-use:host chatgpt fix` F15 | | scan 13/15/8 → 0 errors, 1 warning, 4 advisories (maintainer scan agrees); typecheck clean; live probe on the fixed server 0 errors, 4 warnings (generated `settings.*` tools), 1 advisory. The iframe, tabs, more-than-two-buttons and module-level Map findings are `manual` and were left for a human decision (0.9.0's run restructured them: 0/0/1) |
| `/mcp-use:new demo --template mcp-apps` | | typecheck `no type errors`; live probe 0/0/1 (CG-R03); both screenshots opened and readable |
| `/mcp-use:apps` F13 | | typecheck clean; scan 0/0/1; both screenshots opened and readable |
| `/mcp-use:host archestra add` F14 | | Archestra scan 0/0/0; host recorded as `hosts: [chatgpt, archestra]` |
| `/mcp-use:host chatgpt add` F16 | | ChatGPT scan 0/0/1, Archestra 0/0/0, typecheck clean |
| `/mcp-use:archestra-app fix` | | 2/6/1 → 0/0/0; page script parses; report at the git root; `--fix` on the fixed, committed file: "nothing auto-fixable" |
| `/mcp-use:migrate` F03 (SDK v2, HTTP) | | typecheck clean, SDK dependencies gone, diff = the three annotation changes |
| `/mcp-use:migrate` F02 (SDK v1, stdio) | | stdio baseline live; typecheck clean; diff = annotations, serializer-only schema effects, dialect note, server note |

## Review
CI is green on Ubuntu and macOS. The Codex review could not run: its login had expired, which only a person can renew. An independent `sonnet-high` reviewer read the diff instead and ran the documented invocations and both hooks on odd input: no blocking defects. Of its seven non-blocking items three were fixed here (an absolute `--file` path through a symlinked directory and a file named `..dots.ts` were wrongly rejected, the edit guard had the same symlink mismatch, and the `archestra-docs` tool names now have recorded evidence in `spikes/S6-docs-mcp.md`) and the rest are listed under "Not changed" below.

## What changed
- **Engines:** strict argument parsing and input checks in all four tools (`lib/cli.mjs`); the probe validates before it starts a server and always stops it; `scan --file` accepts `./path` and paths relative to the current directory or `--dir`; `scan` lists files it did not read because of their size and lints a declared Owned App over 512 KB; `ok` follows the findings; `settings.md` with CRLF line endings is read; `lint --fix` writes its report at the file's git root and not when it refuses.
- **Rules and diff:** CG-T01b (non-boolean annotation values); the snapshot diff reports failing list endpoints and notes server changes.
- **Docs:** 15 broken references and the stale wording fixed; the README lists every workflow command with its arguments; judge text for all 20 manual ChatGPT items; the Archestra docs server is named `archestra-docs`.
- **Safety nets:** `lib/refs.mjs` in `validate.mjs`; `tests/docs.test.mjs` (argument hints, workflow list, next actions, no ignored fixture files); `tests/detect.test.mjs` (scenario for every fixture and control); `tests/engine-input.test.mjs`.
- **Tests:** the F16 and p-ar fixture settings are tracked; the hook control timing test takes the best of three batches; the process-tree test cleans up after a failure.
- **Drift:** the Archestra MCP-server reference page changed (a 20-result cap on `search_tools`, a tool this plugin does not mention); hashes refreshed after reading the diff.

## Not changed, still open
- `lib/refs.mjs` does not check a path inside a longer backticked command (such as `sh "${CLAUDE_PLUGIN_ROOT}/skills/new/scripts/scaffold.sh" …`), a `#anchor`, a `./` or `../` prefix, or an extensionless `skills/…` path, and it reports a user-project path under `lib/`, `bin/`, `data/`, `scripts/` or `tests/` until it is added to `ALLOW`.
- The snapshot diff identifies a list-endpoint problem by its message, so one endpoint failing with different text on the two servers shows as one `ADDED` and one `REMOVED` line; a `--snapshot` path that cannot be created is caught after the server has started (the server is still stopped).
- `archestra-app-lint --fix` also writes its report when the file is clean and nothing is auto-fixable.
- Some tests are machine-dependent: the hook latency tests (best of three batches, skipped under load), the probe tests that skip without the installed fixture workspaces, and an orphan test that relies on `/dev/null/x` failing (not portable to Windows).
- The unverified items of 0.9.0 (Owned App on a real Archestra, installed server in its gallery, ChatGPT mobile/PiP/`preferredDisplayMode`, Windows).
- `version gate` columns in `guard-rules.tsv` stay empty (no cited version evidence); documented in the file.
- The AA02/AA03 auto-fixes use built-in markers, not a custom `--policy` file's.
- The probe still reads an SSE response to the end.
- The fix session left four manual design findings alone; whether it should restructure a view on its own is a product decision.
