# Gap analysis against a host checklist

`data/hosts/<host>.checklist.json` lists every rule for a host: `id`, `title`, `methods` (`static`, `probe`, `manual`), `severity` (`error`, `warning`, `advisory`), `fix_mode` (`auto`, `suggest`, `manual`), `submission_only`, `static_rules` (ids in `data/guard-rules.tsv`), `probe_rules` (ids emitted by `mcp-use-probe`), `source` (an id in `data/sources.json`), and `judge` (how to decide a manual item).

Steps:
1. **Static pass.** `mcp-use-scan --host <host> --json` evaluates the `static_rules`.
2. **Live pass.** `mcp-use-probe --host <host> --url … --json` evaluates the `probe_rules` against the running server (annotations, MIME, `resourceUri`, CSP origins, `domain`, display modes, output validation with `--calls`, the ChatGPT auth challenge with `--ua chatgpt`).
3. **Manual pass.** For each checklist item whose `methods` contains `manual` and which neither engine decided, read the relevant files and decide pass, fail or not applicable, quoting the line. Use the item's `judge` text (when an item has none, its `title` is the criterion) and its `source`.
4. **Coverage statement.** Say which items were decided by which method, and which could not be checked (no dev server, no token, no host access). Never mark an item passed from memory.
5. **Add-a-host.** When the project serves host A and must also serve B, run B's checklist over the project and treat every error and warning as a gap; then re-run A's checklist. The portable core (`${CLAUDE_PLUGIN_ROOT}/skills/mcp-apps/references/portable-core.md`) tells you what is already shared.
6. **Improve-a-host.** Same pass on a host the project already serves; the findings are the improvement list.
