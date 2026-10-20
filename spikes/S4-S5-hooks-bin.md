# S4 / S5 — hook cost, `bin/` on PATH
- Node cold start (`node -e 0`) ×20: median 28 ms, p95 30 ms. `sh -c 'exit 0'` median 3.5 ms. → sh pre-filter + Node engine fits the 150 ms budget; full hook timing is measured in row 2 on the real hook.
- Hook stream: `--include-hook-events` emits `hook_started` / `hook_response` (with `stdout`) for `SessionStart:startup`; the toy `additionalContext` came back verbatim.
- `bin/`: headless Bash tool ran the bare command `toy-bin` → `TOY-BIN-OK`. `echo $CLAUDE_PLUGIN_ROOT` in Bash → empty (as documented).
- Windows: not tested (Q7: macOS/Linux/WSL).

**Decision:** bare `bin/` commands are usable from skills; scripts inside skills must not use `${CLAUDE_PLUGIN_ROOT}` in Bash, only in skill markdown/hook commands where it is substituted.
