# plugin-mcp-use

A [Claude Code](https://code.claude.com) plugin for building, migrating, and hardening **TypeScript MCP servers on [mcp-use](https://mcp-use.com)**, adding **MCP Apps** (React views), and targeting **ChatGPT** and **Archestra** as separate hosts with their own rules. It covers five journeys, plus a linter for Archestra Owned Apps.

| You are… | Start with |
|---|---|
| building a new mcp-use server | `/mcp-use:new [name] [--template mcp-server\|mcp-apps] [--hosts chatgpt,archestra]` |
| on the **official MCP TypeScript SDK** (v1 or v2, with or without widgets) and want to move to mcp-use | `/mcp-use:migrate [--stdio "<command>"] [--url <http://.../mcp>]` |
| on mcp-use but have no UI yet | `/mcp-use:apps [tool names…]` |
| serving one host and need another, or the integration is weak | `/mcp-use:host <chatgpt\|archestra> <add\|audit\|fix>` |
| writing an Archestra Owned App (one HTML file on `window.archestra`) | `/mcp-use:archestra-app <lint\|fix\|new> <file.html>` |
| want proof that a server works (typecheck, build, dev server, real tool calls, screenshots) | `/mcp-use:verify [--tool <name>] [--host chatgpt\|archestra]` |
| not sure | `/mcp-use:start` (detects your project and prints the next command) |

> Status: 0.9.0. Everything below was run for real on fixture projects and is recorded in `spikes/`. The two things that need your own Archestra (an Owned App rendered with `validate_app` and `get_app_diagnostics`, and an installed server rendered in its gallery) have **not** been run; see [What is not verified](#what-is-not-verified).

## Install
```sh
claude plugin marketplace add yigitkonur/plugin-mcp-use
claude plugin install mcp-use@plugin-mcp-use
```
Inside a session: `/plugin marketplace add yigitkonur/plugin-mcp-use`, then `/plugin install mcp-use@plugin-mcp-use`. Requires Claude Code 2.1+ and Node ≥ 22.22.2 in the projects you build (mcp-use's own requirement).

## What you get
| Piece | What it does |
|---|---|
| Knowledge skills (model-invoked) `mcp-use-server`, `mcp-apps`, `host-chatgpt`, `host-archestra` | Rules for mcp-use v2 verified against its published types and live runs: tools with explicit annotations, result envelopes, auth, elicitation, views, hooks, CSP, ChatGPT review rules and Apps SDK UI, both Archestra routes. Troubleshooting, deploy and OAuth-debugging references are included. Every TypeScript example marked as a fixture (45 of the 48 blocks) is compiled in CI; the other three (two Next.js snippets, one Vite config) say they are not. |
| Workflow skills (you type them) | `start`, `new`, `apps`, `host`, `migrate`, `verify`, `archestra-app` |
| Agents | `host-reviewer` (audits one host's checklist), `server-surveyor` (inventories an official-SDK server before migration) |
| `bin/` engines (also usable by the model) | `mcp-use-detect` (stack, signals, scenario), `mcp-use-scan` (static rules, `--fix` for mechanical ones), `mcp-use-probe` (live protocol checks over HTTP or `--stdio`, snapshots and `--diff` for migration parity), `archestra-app-lint` (Owned-App lint, `--fix`) |
| Hooks | SessionStart: a short brief (≤1.2 KB) in a Node MCP-server project. PostToolUse on edits: at most one short nudge (≤600 chars) when an edit trips a rule, once per file and rule. Both are silent everywhere else, never block, and make no network calls. |
| Docs MCP servers | `mcp-use-docs`, `openai-docs`, `archestra-docs` (remote, no auth) so API details come from current docs, not memory. |

Footprint: about 745 tokens always in context (`claude plugin details mcp-use`); the rest loads only when a skill or agent fires.

## How each journey works
- **New server:** scaffolds with `create-mcp-use-app`, adds a first tool, and runs a verification ladder: typecheck, build, dev server, real tool calls, light and dark screenshots of views.
- **Migration (official SDK only):** the surveyor inventories the old server; a read-only baseline snapshot is taken from the old server (stdio or HTTP); you port tool by tool with `skills/migrate/references/official-sdk.md`; a second snapshot is diffed against the first, and every difference must be intended. mcp-use 2.11.0 serves HTTP only, so stdio servers become URL-based: the skill asks before porting. Other frameworks (FastMCP, mcp-framework, xmcp, …) are not covered.
- **Add MCP Apps:** decides which tools deserve a view, builds each view against the real hooks, and checks them on every declared host.
- **Add or improve a host:** one gap analysis against `data/hosts/<host>.checklist.json`: static rules, live probe, and a read-only reviewer for the items that need judgment; fixes are applied only for mechanical rules unless you say otherwise.
- **Archestra Owned Apps:** the linter mirrors Archestra's documented save gate and sandbox rules (25 rules, 4 with a safe `--fix`). Archestra's own `validate_app` and `get_app_diagnostics` stay authoritative.

## Scope
Node/TypeScript projects only. In other stacks the hooks print nothing and an explicit command prints a one-line scope notice (`archestra-app-lint` works on any HTML file). mcp-use has a Python SDK without MCP Apps support; this plugin does not target it. Archestra is never installed by this plugin: live steps ask for **your** Archestra URL.

## What is not verified
- An Owned App passing `validate_app` / `get_app_diagnostics` on a real Archestra, and the parity between the linter and the platform (`spikes/S8.md`).
- An installed mcp-use server rendering in Archestra's gallery.
- Archestra's credential model for installed servers, model-context support there, and CSP diagnostics for installed servers (`skills/host-archestra/references/unverified.md`).
- ChatGPT: one live render was done (`spikes/S7-chatgpt-live.md`); mobile, picture-in-picture and honoring of `preferredDisplayMode` were not tested.
- Windows (macOS and Linux CI only).

## Privacy and control
- The three docs MCP servers send your search queries to `docs.mcp-use.com`, `developers.openai.com` and `archestra.ai`. Disable any of them in `/mcp`. The plugin never calls a feedback tool (the mcp-use docs server offers `submit_feedback`).
- Hooks make no network calls. The engines write only when you ask (`--fix`, reports under `.mcp-use-plugin/`, which you should gitignore).
- Off switch: `MCP_USE_PLUGIN=off` in the environment, or `enabled: false` in `.mcp-use-plugin/settings.md`.
- Project settings live in `.mcp-use-plugin/settings.md`: `hosts: [chatgpt, archestra]`, `owned_app_paths: [...]`. Archestra cannot be inferred from code, so it is declared.

## Development
```sh
node scripts/validate.mjs                      # manifests, size caps, source citations, checklists
node --test tests/*.test.mjs                   # engines, hooks, lint corpus, probe, eval graders
sh scripts/typecheck-fixtures.sh               # every documented example compiles against the pinned mcp-use
sh scripts/migration-workspace.sh --check      # official-SDK snippets and migration fixtures compile
claude plugin validate --strict .
```
`AGENTS.md` has the maintainer rules (evidence over memory, version bumps, size caps, quiet hooks). `data/versions.json` pins the verified package versions; a weekly workflow (`drift.yml`) opens an issue when npm or a tracked vendor page changes. Evals (`evals/`, results in `evals/RESULTS.md`) run with `claude plugin eval` and cost model calls, so they are not part of CI.

## Credits and license
MIT. Derived from the `build-mcp-use-server` skill in [skills-by-yigitkonur](https://github.com/yigitkonur/skills-by-yigitkonur) by Yigit Konur; Lars Kappert contributed 17 of that skill's commits. Archestra documentation and source were read as evidence only; no Archestra code is included. mcp-use, ChatGPT and Archestra are products of their respective owners; this plugin is not affiliated with them.
