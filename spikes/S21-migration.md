# S21 — `/mcp-use:migrate` on the three official-SDK fixtures (row 10)

Question: does the migrate skill take an official-SDK server to mcp-use with provable parity?

Setup (2026-10-20): clean git copies of F02 (SDK 1.32.1, stdio, zod 3.25, 3 tools / 1 resource / 1 prompt), F03 (SDK v2 split, HTTP) and F11 (SDK 1.32.1 low-level `Server`, HTTP, OpenAI widget with `window.openai`), headless `claude -p --plugin-dir … --model sonnet`, slash command `/mcp-use:migrate` with the decisions (in place, no auth, widget now for F11) passed in the arguments. After each session the maintainer re-ran typecheck, took a fresh snapshot of the migrated server and diffed it against a baseline snapshot of the **untouched** fixture.

| Fixture | Typecheck | Snapshot diff vs untouched fixture | Other |
|---|---|---|---|
| F03 | `no type errors` | 3 tools changed in `annotations` only; calls identical | direct deps `@modelcontextprotocol/server` and `/node` removed (still listed under `mcp-use`, which depends on it) |
| F02 | `no type errors` | `annotations` + `inputSchema`; calls identical; after removing the two serializer-only effects below every schema is equal | zod upgraded 3.25.76 → 4.6.7; `@modelcontextprotocol/sdk` removed; stdio code gone; scan `findings: []` |
| F11 | `no type errors` | calls identical; `ui://widget/ticket.html` → `ui://views/ticket.html`; `openai/outputTemplate` → `_meta.ui.resourceUri`; `openai/visibility: private` → `ui.visibility: ["app"]`; annotations added; `refresh-ticket` gained an `outputSchema` (deliberate) | light and dark screenshots read in the final run (`shots/row10-f11b-*.png`); `window.openai` replaced by hooks |

Serializer-only schema differences seen on F02 (zod 3 → zod 4), proven by normalizing them away: `additionalProperties: false` disappears from input objects; `z.number().int()` gains `minimum/maximum` of ±9007199254740991. The `$schema` dialect also differs (draft-07 vs 2020-12). `mcp-use-probe --diff` now ignores key order and a top-level `$schema` and prints a note; `parity.md` names the other two.

Problems found and fixed during the run:
1. **Collateral kills.** Three sessions ran in parallel; one used `pkill -f "node src/index.ts"` / `pkill -f "mcp-use dev"`, which killed the other sessions' servers and their `claude` processes (exit 137). Skill and ladder now say: keep the pid, `kill <pid>`, never a broad `pkill -f`. The sessions were re-run one at a time; the re-run F02 used a pid file.
2. **Unreadable light theme.** The first F11 run styled only the dark theme; its light screenshot was black on black. S22 shows the CLI screenshot harness draws a black backdrop in both themes. `migrate` now requires opening light and dark PNGs and fixing unreadable text; the re-run produced a readable view in both.
3. **zod 3** is unsupported by mcp-use (S20); F02 exercised the upgrade.
4. The SDK `McpServer` turns a thrown tool error into an `isError` result while a low-level `Server` handler turns it into a JSON-RPC error (observed on stdio); the playbook lists it as a trap.

Decision: ship `migrate` with one playbook (`official-sdk.md`), the stdio client in `mcp-use-probe`, and the survey agent.
