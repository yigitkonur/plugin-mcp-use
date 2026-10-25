---
name: upgrade
description: Bring a project's mcp-use packages to the latest versions, read what changed, fix what broke, and verify. Use --check to only report.
argument-hint: "[--check] [--pin]"
disable-model-invocation: true
---

# /mcp-use:upgrade

Arguments: `$ARGUMENTS`: `--check` reports and edits nothing; `--pin` writes exact versions (default: the caret range npm writes). The rule of this plugin is **latest by default**: install the newest release and keep up with it, pin only when the user says the deploy target needs it.

1. **Find what is installed.** Run `mcp-use-detect --json`; read `versions["mcp-use"]` and the entry. Then `npm ls mcp-use @mcp-use/cli @mcp-use/client @mcp-use/inspector --depth=0` and `npm view <each> version` for the latest. Say old -> new per package. Nothing newer: say so and stop. Dist-tag `canary` is not a release: never install it.
2. **Read what changed before installing.** For `mcp-use` and the CLI, compare tarballs, not release notes (GitHub release bodies are often empty stubs): `npm pack mcp-use@<old> mcp-use@<new>` into a scratch directory, extract both, `diff -r` the `dist/**/*.d.ts` and `package.json` (`exports`, `dependencies`, `engines`). Also read `${CLAUDE_PLUGIN_ROOT}/skills/mcp-use-server/references/versions.md` (what is known to have changed) and, through the docs MCP `query_docs_filesystem_mcp_use`, the changelog. Classify each difference as BREAKING (removed or changed signature the project uses: grep the project), NEW (a feature worth using), or NOTHING. With `--check`, stop here and report the table.
3. **Upgrade.** `npm install mcp-use@latest @mcp-use/cli@latest` (add `@mcp-use/client@latest` and `@mcp-use/inspector@latest` if the project has them; use the project's package manager). Zod must stay `>=4.2.0`. Time limit 5 minutes.
4. **Fix and verify.** Run rungs 1 to 4 of `${CLAUDE_PLUGIN_ROOT}/skills/verify/references/ladder.md` (typecheck, build, dev, real tool call), then `mcp-use-scan --dir .`. Fix breakage from the type errors, using the BREAKING list; up to three fixes with a new hypothesis each. A view project also needs a screenshot (rung 4).
5. **Report.** Packages old -> new, the differences that mattered and what you changed for them, new features not adopted (offer them, do not add them), what each rung printed, and anything UNVERIFIED. If a plugin reference disagrees with the new types, the types win; tell the user so the plugin can be updated.

Do not deploy. Do not change files outside the project.
