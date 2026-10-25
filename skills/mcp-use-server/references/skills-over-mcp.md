# Skills over MCP (SEP-2640)

An mcp-use server can serve agent skills (instructions plus reference files) next to its tools. Use a skill when a multi-step procedure or a policy would overload a tool description. Tools act, resources expose read-only content, prompts return message templates, skills teach the agent how to combine them.

## Layout
```text
my-server/
├── skills/
│   └── process-refund/
│       ├── SKILL.md          # YAML frontmatter with name and description, then the procedure
│       └── references/policy.md
├── index.ts
└── package.json
```
`SKILL.md` must begin with YAML frontmatter containing `name` and `description`. Keep it procedural; put long policies in `references/`.

## Enable and validate
- A `skills/` directory is discovered by default. `skills: true`, `skills: { directory: "custom-skills" }` or `skills: false` on `new MCPServer({...})` control it.
- `mcp-use build` fails (exit 1) on a malformed skill. Verified: a `skills/broken/SKILL.md` without frontmatter gives `SKILL.md must begin with YAML frontmatter`. `mcp-use dev` is permissive.

## What a client sees (verified against mcp-use 2.11.0, 2026-10-20)
- Capability: `extensions["io.modelcontextprotocol/skills"] = { "directoryRead": true }`.
- Every skill file is a resource with URI `skill://<skill-name>/<path>` (for example `skill://process-refund/SKILL.md`, `skill://process-refund/references/policy.md`), readable with `resources/read`.
- `skills/list` returns `{ skills: [{ uri, frontmatter: { name, description }, resources: [{ uri, digest }] }], resultType: "complete" }`.
- `skills/get` takes `{ uri }` (not `name`).
- Over raw HTTP the 2026 protocol requires the `Mcp-Method` header matching the body (`Mcp-Method: skills/list`), `mcp-protocol-version: 2026-07-28`, and the `_meta` client envelope in `params` (S17); the legacy `initialize` handshake also works. `mcp-use-probe` and `mcp-use client` do this for you.
- The official SDK's `@modelcontextprotocol/server` 2.4.0 ships a Skills extension (`@modelcontextprotocol/server/ext/skills`) whose schema requires `size` on resource entries and `ttlMs` and `cacheScope` on `skills/list` and `skills/get`. mcp-use 2.11.x emits `digest` and none of those (read from the schema, not run against the official `SkillsClient`; S27), so a strict official client may reject the list.
- `mcpc` 0.7.0's `skills-list` rejects this result because entries carry `digest` but no `size`; read `skill://…` URIs with `resources-read` instead.

## Verify
`mcp-use client <name> resources list` shows the `skill://` entries; `resources read skill://<name>/SKILL.md` returns the body.

Sources: M1, M2, S17, S27.
