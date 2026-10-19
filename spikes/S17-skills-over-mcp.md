# S17 — Skills over MCP as served by mcp-use 2.11.0
Project with `skills: true` and `skills/process-refund/{SKILL.md, references/policy.md}`, `mcp-use dev`, then mcpc and raw JSON-RPC.
- Capabilities: `"extensions":{"io.modelcontextprotocol/skills":{"directoryRead":true}}`.
- `resources/list` contains `skill://process-refund/SKILL.md` and `skill://process-refund/references/policy.md` (MIME `text/markdown`); `resources/read skill://process-refund/SKILL.md` returns the file.
- `skills/list` (raw POST needs header `Mcp-Method: skills/list`, `mcp-protocol-version: 2026-07-28`, and the `_meta` client envelope) → `{"skills":[{"uri":"skill://process-refund/SKILL.md","frontmatter":{"name":"process-refund","description":"…"},"resources":[{"uri":"skill://process-refund/references/policy.md","digest":"sha256:…"}, …]}],"resultType":"complete"}`.
- `skills/get` with `{"name":"process-refund"}` → `-32602 Invalid params for skills/get: uri must be a string` (it takes `uri`).
- `mcpc 0.7.0 skills-list` → `Invalid result for skills/list: skills.0.resources.0.size: must be a non-negative integer (bytes)`.
- `mcp-use build` with `skills/broken/SKILL.md` (no frontmatter) → `SKILL.md must begin with YAML frontmatter`, exit 1; without it exit 0.
