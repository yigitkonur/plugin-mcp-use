---
name: archestra-app
description: Lint, fix or create an Archestra Owned App (single HTML file using window.archestra) with archestra-app-lint, then push it to the user's Archestra and read validate_app and get_app_diagnostics.
argument-hint: "<lint|fix|new> <file.html>"
disable-model-invocation: true
---

# /mcp-use:archestra-app

> In Codex: `bin/` is not on PATH and `${CLAUDE_PLUGIN_ROOT}` is unset. The plugin root is two folders above this file: run engines as `node <root>/bin/<name>` and read `${CLAUDE_PLUGIN_ROOT}` as `<root>`. `/mcp-use:<x>` means the skill `<x>`.

Arguments: `$ARGUMENTS` = `<mode> <file.html>`. Modes: `lint` (read-only report; default), `fix` (apply fixes), `new` (create a file from the skeleton and lint it). This works on any HTML file in any repository; no Node project is needed. Read `${CLAUDE_PLUGIN_ROOT}/skills/host-archestra/SKILL.md` and `${CLAUDE_PLUGIN_ROOT}/skills/host-archestra/references/route-b-sdk.md` before writing app code. The platform's `validate_app` and `get_app_diagnostics` are the authority; the lint is a pre-flight.

## lint
1. Run `archestra-app-lint <file> --json` (add `--ui-permissions camera,…` if the app's `scaffold_app` call declared any). Exit 0 clean, 1 warnings or advisories, 2 errors.
2. Print the findings grouped by severity with line numbers, `fix_mode` and the rule's message, then the counts. Point to `references/fix-recipes.md` for anything not auto.
3. Stop. Do not edit.

## fix
1. Run the lint, then write its report (the engine does this on `--fix`).
2. Tell the user which rules are `auto` (AA02, AA03, AW01, AW04) and which need judgment. Ask them to commit or stash the file first; `--fix` refuses a dirty tree unless `--force`.
3. `archestra-app-lint <file> --fix`. Review the diff, in particular AW04, which assumes the private partition: change to `storage.shared` when every viewer should see the data.
4. Apply the remaining findings by hand using `references/fix-recipes.md`, errors first, one logical change at a time, then warnings. Skip advisories that do not apply and say why.
5. Re-run the lint until a pass changes nothing. Print before and after counts per severity. Errors must be 0.
6. Offer the platform step (below). Without the user's Archestra, say the file is lint-clean but not validated by the platform: UNVERIFIED.

## new
1. Ask what the app does and which MCP tools it should call (names as Archestra lists them, `server__tool`) in one question. If tools are unknown, build the app around storage and say so.
2. Copy `${CLAUDE_PLUGIN_ROOT}/skills/archestra-app/assets/skeleton.html` to the requested path (refuse to overwrite an existing file) and edit it for the task. Keep it one complete document, no network, no frames, `.arch-*` classes and the injected variables for styling.
3. Lint until clean, as in `fix`.

## Platform step (needs the user's Archestra)
Follow `${CLAUDE_PLUGIN_ROOT}/skills/verify/references/archestra-connect.md`: ask for the Archestra URL, never install or start Archestra. Push the file (`edit_app`, or `scaffold_app` for a new app), run `validate_app`, open the app, then `get_app_diagnostics`. Compare the platform's findings with the lint's and note differences for `spikes/S8.md`. Reading the results: `${CLAUDE_PLUGIN_ROOT}/skills/host-archestra/references/verify-in-archestra.md`.
