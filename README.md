# plugin-mcp-use

A [Claude Code](https://code.claude.com) plugin for building, migrating, and hardening **TypeScript MCP servers on [mcp-use](https://mcp-use.com)**, adding **MCP Apps** (React views), and targeting **ChatGPT** and **Archestra** as separate hosts with their own rules.

> Status: 0.1.0 (core). Later releases add the ChatGPT host checks and edit guard, the Archestra Owned-App linter, and migration from the official MCP TypeScript SDK. See [Roadmap](#roadmap).

## Install
```sh
claude plugin marketplace add yigitkonur/plugin-mcp-use
claude plugin install mcp-use@plugin-mcp-use
```
Inside a session: `/plugin marketplace add yigitkonur/plugin-mcp-use`, then `/plugin install mcp-use@plugin-mcp-use`. Requires Node ≥ 22.22.2 in the projects you build (mcp-use's own requirement) and Claude Code 2.1+.

## What you get (0.1.0)
| Piece | What it does |
|---|---|
| Knowledge skills `mcp-use-server`, `mcp-apps` | Model-invoked rules for mcp-use v2: tools with explicit annotations, result envelopes, auth, elicitation, views, hooks, CSP. Every code example is compiled in CI against the pinned mcp-use. |
| `/mcp-use:start` | Detects the stack, MCP signals, versions and hosts, and prints the next command. |
| `/mcp-use:new [name] [--template mcp-server\|mcp-apps]` | Scaffolds a project with `create-mcp-use-app`, adds a first tool, and runs the verification ladder. |
| `/mcp-use:verify` | Typecheck, build, dev server, real tool calls through `mcp-use client`, and view screenshots. |
| Session brief (hook) | At session start, in a Node project with an MCP server, a brief (≤1.2 KB) with scenario, versions and next commands. Silent everywhere else. |
| Docs MCP servers | `mcp-use-docs`, `openai-docs`, `archestra-docs` (remote, no auth) so API details come from current docs, not memory. |

## Scope
Node/TypeScript projects only. In other stacks the hooks print nothing and an explicit command prints a one-line scope notice. mcp-use has a Python SDK without MCP Apps support; this plugin does not target it.

## Privacy and control
- The three docs MCP servers send your search queries to `docs.mcp-use.com`, `developers.openai.com` and `archestra.ai`. Disable any of them in `/mcp`. The plugin never calls their `submit_feedback` tools.
- Hooks make no network calls and write nothing.
- Off switch: `MCP_USE_PLUGIN=off` in the environment, or `enabled: false` in `.mcp-use-plugin/settings.md`.
- Project settings live in `.mcp-use-plugin/settings.md` (gitignore it): `hosts: [chatgpt, archestra]`. Archestra cannot be inferred from code, so it is declared.

## Roadmap
| Version | Adds |
|---|---|
| 0.2.0 | ChatGPT host skill and checklist, edit-time guard, `mcp-use-scan`, `mcp-use-probe`, `/mcp-use:host`, `/mcp-use:apps` |
| 0.3.0 | Archestra host skill (installed-server route and Owned Apps), `archestra-app-lint` with `--fix`, `/mcp-use:archestra-app` |
| 0.4.0 | `/mcp-use:migrate` from the official MCP TypeScript SDK, restored troubleshooting, deploy and auth references |
| 1.0.0 | Evals, CI, drift checks |

## Credits and license
MIT. Derived from the `build-mcp-use-server` skill in [skills-by-yigitkonur](https://github.com/yigitkonur/skills-by-yigitkonur) by Yigit Konur; Lars Kappert contributed 17 of that skill's commits. Archestra documentation and source were read as evidence only; no Archestra code is included.
