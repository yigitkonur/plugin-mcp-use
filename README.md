# plugin-mcp-use

a [claude code](https://code.claude.com) plugin for shipping **typescript mcp servers on [mcp-use](https://mcp-use.com)**, bolting **mcp apps** (react views) onto them, and making them actually behave in **chatgpt** and **archestra**: two hosts with very different rules, so the plugin treats them as two targets, not one. five journeys plus a linter for archestra owned apps. no vibes-based claims: everything below was run for real, and the receipts live in `spikes/`.

> status: pre-1.0 (the current version is in `.claude-plugin/plugin.json` and on the releases page). tested on macos and linux ci. the bits that need your own archestra (an owned app checked by `validate_app` / `get_app_diagnostics`, and an installed server rendering in its gallery) haven't been run yet. see [what's not verified](#whats-not-verified).

<!-- kit:install:start -->
## install

Every plugin of ours is installed **once, globally, and off**, then **turned on per project**. Nothing runs and no tokens are spent in chats that don't switch it on. It works the same in Claude Code and Codex.

### 1. install it globally

**Claude Code**

```sh
claude plugin marketplace add yigitkonur/plugin-mcp-use
claude plugin install mcp-use@plugin-mcp-use -s user          # stays off: defaultEnabled is false in the manifest
```

**Codex** (0.163+)

```sh
codex plugin marketplace add yigitkonur/plugin-mcp-use
codex plugin add mcp-use@plugin-mcp-use
codex-plugin-project.sh global-off mcp-use@plugin-mcp-use     # Codex has no enable/disable command; this keeps it off everywhere
```

All our plugins, both hosts, plus the `plugin` command and the 6-hourly update job, in one line:

```sh
curl -fsSL https://raw.githubusercontent.com/yigitkonur/plugin-kit/main/install.sh | sh -s -- --all
```

### 2. turn it on in a project

```sh
cd your-project
plugin on mcp-use    # Claude Code and Codex, this folder only
plugin off mcp-use   # undo
plugin               # or pick from a list (TUI)
```

By hand, without the `plugin` command:

```sh
claude plugin enable mcp-use@plugin-mcp-use --scope project      # undo: claude plugin disable mcp-use@plugin-mcp-use --scope project
codex-plugin-project.sh on mcp-use@plugin-mcp-use . --trust      # undo: codex-plugin-project.sh off mcp-use@plugin-mcp-use
```

Restart `claude` / `codex` in that folder afterwards.
Codex reads a folder's `.codex/config.toml` only when the folder is trusted; `--trust` adds that, and it also enables the folder's hooks and rules, so use it for your own projects only. `plugin` and `codex-plugin-project.sh` come from [plugin-kit](https://github.com/yigitkonur/plugin-kit) (the one-line installer above).

### 3. updates

A plugin updates only when its `version` changes, and this repo's `release` workflow bumps it on every shipped change. Machines pick it up with `plugin update`, or by themselves with the 6-hourly job (`plugin autoupdate install`). By hand:

```sh
claude plugin marketplace update plugin-mcp-use && claude plugin update mcp-use@plugin-mcp-use
codex plugin marketplace upgrade plugin-mcp-use        # then start a new session
```

No GitHub SSH key on the machine? `export CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1` (`plugin install` sets it in Claude's settings for you).

### 4. uninstall

```sh
claude plugin uninstall mcp-use@plugin-mcp-use -s user
claude plugin marketplace remove plugin-mcp-use
codex plugin remove mcp-use@plugin-mcp-use
codex plugin marketplace remove plugin-mcp-use
```
<!-- kit:install:end -->

### check it loaded

`claude plugin details mcp-use` lists 12 skills, 2 agents, 2 hook events, 3 docs mcp servers and about 1.2k tokens always on once the plugin is enabled in a project (nothing while it is off).

### codex

the same plugin runs in codex (codex-cli 0.163.0 tested). the first time you turn it on in a project, codex asks you to review the plugin's hooks.

what differs from claude code: no plugin agents (the host and migrate skills tell codex to read `agents/*.md` and do that job itself), no slash commands (each `/mcp-use:<x>` is the skill `<x>`), `bin/` is not on `PATH` (the skills and the session brief give the `node <plugin root>/bin/<name>` form), and the edit guard listens for `apply_patch`.

you need: claude code (tested on 2.1.302 to 2.1.307), node on your `PATH` (the engines and hooks run on it; without node the hooks just stay quiet), and node ≥ 22.22.2 in the projects you build (that floor is mcp-use's, not ours).

## pick your journey

| you are… | type this |
|---|---|
| starting a new mcp-use server | `/mcp-use:new [name] [--template mcp-server\|mcp-apps] [--hosts chatgpt,archestra]` |
| on the **official mcp typescript sdk** (v1 or v2, widgets or not) and want off it | `/mcp-use:migrate [--stdio "<command>"] [--url <http://.../mcp>]` |
| on mcp-use already, but no ui yet | `/mcp-use:apps [tool names…]` |
| serving one host and need the other, or your integration is kinda mid | `/mcp-use:host <chatgpt\|archestra> <add\|audit\|fix>` |
| writing an archestra owned app (one html file on `window.archestra`) | `/mcp-use:archestra-app <lint\|fix\|new> <file.html>` |
| want proof the server works, not a promise (typecheck, build, dev server, real tool calls, screenshots) | `/mcp-use:verify [--tool <name>] [--host chatgpt\|archestra]` |
| keep the project on the latest mcp-use (reads what changed, upgrades, re-verifies) | `/mcp-use:upgrade [--check] [--pin]` |
| not sure tbh | `/mcp-use:start` (detects your project and prints the next command) |

## what's in the box

| piece | what it does |
|---|---|
| knowledge skills (the model loads them itself): `mcp-use-server`, `mcp-apps`, `host-chatgpt`, `host-archestra` | the rules for mcp-use v2, checked against its published types and live runs: tools with explicit annotations, result envelopes, auth, elicitation, views, hooks, csp, chatgpt review rules and apps sdk ui, both archestra routes. troubleshooting, deploy and oauth-debugging references included. every typescript example marked as a fixture (45 of the 48 blocks) is compiled in ci; the other three (two next.js snippets, one vite config) say so. |
| workflow skills (you type them) | `start`, `new`, `apps`, `host`, `migrate`, `verify`, `upgrade`, `archestra-app` |
| agents | `host-reviewer` (audits one host's checklist), `server-surveyor` (inventories an official-sdk server before a migration) |
| `bin/` engines (the model runs them too) | `mcp-use-detect` (stack, signals, scenario), `mcp-use-scan` (static rules, `--fix` for the mechanical ones), `mcp-use-probe` (live protocol checks over http or `--stdio`, snapshots, `--diff` for migration parity), `archestra-app-lint` (owned-app lint, `--fix`). bad input gets a clear usage error (exit 3), never a fake "clean". |
| hooks | session start: a short brief (≤ 1.2 kb) in a node mcp-server project. after edits: at most one short nudge (≤ 600 chars) when an edit trips a rule, once per file and rule. silent everywhere else, never block, no network calls. |
| docs mcp servers | `mcp-use-docs`, `openai-docs`, `archestra-docs` (remote, no auth), so api details come from current docs, not from a model's memory |

footprint: about 1.2k tokens always in context once enabled (nothing while disabled) (`claude plugin details mcp-use`). everything else loads only when a skill or agent actually fires.

## how each journey goes

- **new server:** scaffolds with `create-mcp-use-app`, adds a first tool, then climbs a verification ladder: typecheck, build, dev server, real tool calls, light and dark screenshots of every view.
- **migration (official sdk only):** the surveyor inventories the old server, a read-only baseline snapshot is taken from it (stdio or http), you port tool by tool with `skills/migrate/references/official-sdk.md`, and a second snapshot is diffed against the first. every difference has to be intended. heads up: mcp-use 2.11.0 serves http only, so stdio servers become url-based, and the skill asks before porting. other frameworks (fastmcp, mcp-framework, xmcp, …) aren't covered.
- **add mcp apps:** decides which tools actually deserve a view, builds each one against the real hooks, and checks it on every declared host.
- **add or improve a host:** one gap analysis against `data/hosts/<host>.checklist.json`: static rules, a live probe, and a read-only reviewer for the items that need judgment. only mechanical fixes get applied unless you say otherwise.
- **archestra owned apps:** the linter mirrors archestra's documented save gate and sandbox rules (25 rules, 4 with a safe `--fix`). archestra's own `validate_app` and `get_app_diagnostics` stay the source of truth.

## scope (aka what this is not)

node and typescript projects only. in other stacks the hooks print nothing and an explicit command prints a one-line scope notice (`archestra-app-lint` works on any html file, though). mcp-use has a python sdk without mcp apps support; this plugin doesn't target it. and it never installs archestra for you: live steps ask for **your** archestra url.

## what's not verified

being upfront about it:

- an owned app passing `validate_app` / `get_app_diagnostics` on a real archestra, and how well the linter matches the platform (`spikes/S8.md`).
- an installed mcp-use server rendering in archestra's gallery.
- archestra's credential model for installed servers, model-context support there, and csp diagnostics for installed servers (`skills/host-archestra/references/unverified.md`).
- chatgpt: one live render was done (`spikes/S7-chatgpt-live.md`); mobile, picture-in-picture and whether `preferredDisplayMode` is honored weren't tested.
- windows (ci runs macos and linux only).

## privacy and the off switch

- the three docs mcp servers send your search queries to `docs.mcp-use.com`, `developers.openai.com` and `archestra.ai`. don't want that? disable any of them in `/mcp`. the plugin never calls a feedback tool (the mcp-use docs server offers `submit_feedback`).
- hooks make no network calls. the engines only write when you ask (`--fix`, and reports under `.mcp-use-plugin/`, which you should gitignore).
- off switch: `MCP_USE_PLUGIN=off` in the environment, or `enabled: false` in `.mcp-use-plugin/settings.md`. that silences the hooks; the skills and docs servers stay available.
- project settings live in `.mcp-use-plugin/settings.md`: `hosts: [chatgpt, archestra]`, `owned_app_paths: [...]`. archestra can't be inferred from code, so you declare it.

## dev

```sh
node scripts/validate.mjs                      # manifests, size caps, source citations, checklists, doc references
node --test tests/*.test.mjs                   # engines, hooks, lint corpus, probe, eval graders, docs
sh scripts/typecheck-fixtures.sh               # every documented example compiles against the pinned mcp-use
sh scripts/migration-workspace.sh --check      # official-sdk snippets and migration fixtures compile
claude plugin validate --strict .
```

`AGENTS.md` has the maintainer rules (evidence over memory, version bumps, size caps, quiet hooks). `data/versions.json` pins the verified package versions, and a weekly workflow (`drift.yml`) opens an issue when npm or a tracked vendor page changes. evals (`evals/`, results in `evals/RESULTS.md`) run with `claude plugin eval` and cost real model calls, so they're not part of ci. release receipts: `spikes/LEDGER-0.9.0.md` and `spikes/LEDGER-0.9.1.md`.

## credits and license

mit. derived from the `build-mcp-use-server` skill in [skills-by-yigitkonur](https://github.com/yigitkonur/skills-by-yigitkonur) by yigit konur; lars kappert contributed 17 of that skill's commits. archestra's docs and source were read as evidence only; no archestra code is included. mcp-use, chatgpt and archestra are products of their respective owners, and this plugin isn't affiliated with them.
