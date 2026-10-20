# S14 / S15 — test runner and eval format
- `claude plugin test` runs `*.test.ts(x)` that import from `claude-code/testing` — a "mod" kit, not documented for plugins. **Decision:** use `node --test` (S14 not spiked further).
- `claude plugin eval init --bare demo` → `evals/demo/prompt.md` (frontmatter `max_turns`, `allowed_tools`) and `evals/demo/graders/criteria.md` (frontmatter `type: llm`, `weight`). Page saved at `_sources/fetched/claude-plugin-evals.md` (code.claude.com/docs/en/plugin-evals). Grader types: `regex`, `tool_used`, `tool_order`, `file_exists` (free, from transcript/files), `llm`, `baseline` (judge model). Eval runs load nothing from user settings, project `.claude/`, `.mcp.json`, or other plugins; the plugin's own hooks/MCP/skills load.
- Headless test sessions (`-p --plugin-dir … --setting-sources project,local`) listed only the toy plugin plus two builtin plugins, plus account-level claude.ai MCP connectors.

**Decision:** Stage 6 evals use `claude plugin eval` with `tool_used: Skill` graders and deterministic `regex`/`file_exists`; scoring by our scan/lint exit codes is done in tests instead (graders can't run commands).
