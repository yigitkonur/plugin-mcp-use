# `create-mcp-use-app` templates (observed 2026-10-20 on 2.1.0, re-checked 2026-10-25)

`npx create-mcp-use-app@latest <name> --template <t> --npm --install [--skills|--no-skills]`. Run without `--skills` or `--no-skills` it still copies the official skill (non-interactive default). `npx create-mcp-use-app --list-templates` lists the templates.

| Template | Contents | Fix after scaffolding |
|---|---|---|
| `blank` | a minimal server, no tools | add a tool |
| `mcp-server` | tool `fetch-weather` (annotations: `readOnlyHint`, `openWorldHint` only), prompt `review-code`, `landing.tsx`, `public/` | add `destructiveHint: false` to the tool (ChatGPT review needs all three); replace the demo |
| `mcp-apps` | tools `show-app` (bound to view `my-view`) and `say-hello`, both with all three annotations; `views/my-view/` (React, icons, tooltip, mesh gradient); `view.csp` for Google Fonts | replace the demo tool and view; keep the three annotations |

`blank`, `mcp-server` and `mcp-apps` all ship a `landing.tsx` (S27).

Every template: `package.json` pins `mcp-use` exactly, to **npm latest at scaffold time** (the scaffolder rewrites the template's `workspace:*`; 2.11.2 on 2026-10-25, whatever the scaffolder's own version is, S27), `typescript ^7.0.2` and `@types/node ^22.20.0` as devDependencies, `"type": "module"`, `engines.node >=22.22.2`, scripts `dev`, `build`, `start`, `deploy`, `typecheck`; `tsconfig.json`; generated `mcp-env.d.ts`; `.gitignore` (ignores `.mcp-use/`, `node_modules/`).

With skills copied: `.claude/skills/mcp-apps-builder/`, `.agents/skills/mcp-apps-builder/`, `.cursor/skills/mcp-apps-builder/` (a 3.7 KB router plus seven short references). It tells the agent to treat installed types as the source of truth, which matches this plugin; both can coexist.

Not installed by the template: `@mcp-use/client` (needed by `mcp-use client` and `mcp-use screenshot`) and `@openai/apps-sdk-ui` (ChatGPT styling).

Sources: S13, S16, S27.
