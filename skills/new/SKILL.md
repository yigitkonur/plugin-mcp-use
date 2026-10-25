---
name: new
description: Scaffold a new mcp-use v2 TypeScript MCP server (tools only, or with MCP Apps views), add a first tool, and verify it runs.
argument-hint: "[name] [--template mcp-server|mcp-apps] [--hosts chatgpt,archestra]"
disable-model-invocation: true
---

# /mcp-use:new

> In Codex: `bin/` is not on PATH and `${CLAUDE_PLUGIN_ROOT}` is unset. The plugin root is two folders above this file: run engines as `node <root>/bin/<name>` and read `${CLAUDE_PLUGIN_ROOT}` as `<root>`. `/mcp-use:<x>` means the skill `<x>`.

Arguments: `$ARGUMENTS`. Use what was given; ask only for what is missing and what you cannot choose sensibly (name, template, hosts, first tool's purpose). If the user said to use defaults, use `mcp-server`, no hosts, and a small example tool, and do not ask.

1. **Preflight.** Run `mcp-use-detect --preflight --dir .` and read `result`. If `node_ok` is false, stop: show `node` against `required` (`>=22.22.2`), and if `version_manager_files` is non-empty name the matching tool's command (for `.nvmrc`: `nvm use`). Never install Node. If the target directory has files other than a bare repo, scaffold into a new subdirectory.
2. **Choose.** Template: `mcp-server` (tools only) or `mcp-apps` (tools plus React views). Hosts: ChatGPT, Archestra, both, or not yet. Read `references/templates.md` for what each template contains and what to fix after scaffolding.
3. **Scaffold** (confirm once; it runs `npx` and installs dependencies):
   `sh "${CLAUDE_PLUGIN_ROOT}/skills/new/scripts/scaffold.sh" <template> <name> npm` (add `--no-skills` if the user does not want the official `mcp-apps-builder` skill copied into `.claude/skills`; add `pnpm` or `bun` for another package manager). Time limit: 5 minutes. The script refuses to overwrite and prints `scaffold: ok <name>`.
4. **Record the hosts.** In the new project create `.mcp-use-plugin/settings.md` with frontmatter `hosts: [chatgpt]` (or `archestra`, or both) and add `.mcp-use-plugin/` to its `.gitignore`.
5. **First tool.** Edit `index.ts`: replace the demo with the user's first tool per `${CLAUDE_PLUGIN_ROOT}/skills/mcp-use-server/references/tools-and-results.md`: `inputSchema` with described fields, **all three annotations**, `outputSchema` plus matching `structuredContent`, a raw result envelope, side effects in the description, `export const`, `export default server`. If you add a view, follow `${CLAUDE_PLUGIN_ROOT}/skills/mcp-apps/references/views.md`.
6. **Latest.** The scaffold pins `mcp-use` to npm latest when it runs; run `npm outdated mcp-use @mcp-use/cli` and, if either is behind, `npm install mcp-use@latest @mcp-use/cli@latest`. Do not pin unless the user asks.
7. **Verify.** Read `${CLAUDE_PLUGIN_ROOT}/skills/verify/references/ladder.md` and run rungs 1 to 4 in the new project. Report each command with its output as you saw it.
8. **Report.** Where the project is, how to start it (`npm run dev`), what each rung showed, and what is still open (hosts not yet verified live, auth not configured).

Do not run `npm run deploy`, `mcp-use deploy` or `mcp-use login`. Do not edit anything outside the new project.
