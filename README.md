# plugin-mcp-use

a [claude code](https://code.claude.com) plugin for shipping **typescript mcp servers on [mcp-use](https://mcp-use.com)**, bolting **mcp apps** (react views) onto them, and making them actually behave in **chatgpt** and **archestra**: two hosts with very different rules, so the plugin treats them as two targets, not one. five journeys plus a linter for archestra owned apps. no vibes-based claims: everything below was run for real, and the receipts live in `spikes/`.

> status: pre-1.0 (the current version is in `.claude-plugin/plugin.json` and on the releases page). tested on macos and linux ci. the bits that need your own archestra (an owned app checked by `validate_app` / `get_app_diagnostics`, and an installed server rendering in its gallery) haven't been run yet. see [what's not verified](#whats-not-verified).

## install

the one-liner (claude code 2.1.275+). it adds the marketplace if it isn't there yet and installs the plugin:

```sh
claude plugin install mcp-use --marketplace yigitkonur/plugin-mcp-use
```

older claude code, or you like two steps:

```sh
claude plugin marketplace add yigitkonur/plugin-mcp-use
claude plugin install mcp-use@plugin-mcp-use
```

it loads the next time you start claude code (or run `/reload-plugins` in a session that's already open). check it landed:

```sh
claude plugin details mcp-use   # 12 skills, 2 agents, 2 hook events, 3 docs mcp servers, ~740 tokens always on
```

- **inside a session instead:** `/plugin marketplace add yigitkonur/plugin-mcp-use`, then `/plugin install mcp-use@plugin-mcp-use` (opens the plugin panel so you can review it and pick a scope).
- **installed everywhere, on only where you want it (costs no tokens while off):** install once for your user and switch it off:

  ```sh
  claude plugin install mcp-use --marketplace yigitkonur/plugin-mcp-use
  claude plugin disable mcp-use@plugin-mcp-use --scope user
  ```

  then, in any project, turn it on for that project only (writes `"mcp-use@plugin-mcp-use": true` to the project's `.claude/settings.json`):

  ```sh
  claude plugin enable  mcp-use@plugin-mcp-use --scope project   # on here
  claude plugin disable mcp-use@plugin-mcp-use --scope project   # off again
  claude plugin list                                             # what's on, and at which scope
  ```
- **one repo only, no global install:** `claude plugin marketplace add yigitkonur/plugin-mcp-use --scope project`, then `claude plugin install mcp-use@plugin-mcp-use --scope project`. that turns it on for the repo (commit `.claude/settings.json` and teammates get it; each runs the install once). add `claude plugin disable mcp-use@plugin-mcp-use --scope project` right after if you want it installed but off.
- **auto-update:** third-party marketplaces are off by default in claude code. turn it on once with `/plugin` > marketplaces > plugin-mcp-use > enable auto-update, or declare it in `settings.json` (user or project):

  ```json
  { "extraKnownMarketplaces": { "plugin-mcp-use": { "source": { "source": "github", "repo": "yigitkonur/plugin-mcp-use" }, "autoUpdate": true } } }
  ```

  per the docs, claude code checks a random delay (up to ten minutes) after your first message, then tells you `Plugin updated … run /reload-plugins`; new sessions pick it up on their own. every merge to main that changes what you receive is released automatically (version bump, tag, release), so an enabled auto-update always has something to find.
- **update by hand:** `claude plugin marketplace update plugin-mcp-use`, then `claude plugin update mcp-use@plugin-mcp-use` (restart to apply).
- **uninstall:** `claude plugin uninstall mcp-use@plugin-mcp-use`.

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

footprint: about 740 tokens always in context (`claude plugin details mcp-use`). everything else loads only when a skill or agent actually fires.

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
