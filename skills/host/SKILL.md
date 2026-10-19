---
name: host
description: Check or improve an mcp-use server's integration with one host (ChatGPT now, Archestra in a later version): add a host, audit it, or fix findings.
argument-hint: "<chatgpt> <add|audit|fix>"
disable-model-invocation: true
---

# /mcp-use:host

Arguments: `$ARGUMENTS` = `<host> <mode>`. `host`: `chatgpt` (`archestra` ships in 0.3.0; say so and stop if asked). `mode`: `audit` (default; read-only), `add` (close the gaps for a host the project does not serve yet), `fix` (apply fixes to findings). One engine does all three: a gap analysis against `${CLAUDE_PLUGIN_ROOT}/data/hosts/<host>.checklist.json`. Read `references/gap-analysis.md` first.

1. **Scope.** Run `mcp-use-detect --json`. Continue only for a Node project with an mcp-use server (`M-USE-SRV`); otherwise print the scope notice from `/mcp-use:start` and stop. For `add`, record the host in `.mcp-use-plugin/settings.md` (`hosts: [...]`; create the file and gitignore `.mcp-use-plugin/` after asking).
2. **Evidence.** Run `mcp-use-scan --host <host> --json` (static). Start the dev server as in `${CLAUDE_PLUGIN_ROOT}/skills/verify/references/ladder.md` rung 2, then `mcp-use-probe --url http://localhost:<port>/mcp --host <host> --calls <file> --json`; add `--ua chatgpt` when any tool declares `securitySchemes`. Put only **read-only** tools (`readOnlyHint: true`) with sample arguments from their `inputSchema` into the calls file; never call a tool that writes unless the user says so.
3. **Judgment.** Delegate to the `host-reviewer` agent (host, project root, dev URL). It runs the same engines read-only, reads flagged code, judges the checklist's `manual` items, and returns findings in `references/finding-schema.md`. If the agent is unavailable, do it yourself with the same files.
4. **Report first.** Merge the scan, probe and reviewer findings, group by severity (error, warning, advisory) with `fix_mode`, and write them to `.mcp-use-plugin/reports/<host>-<date>.json` before changing anything. Items marked `submission_only` are TODOs with an owner, not errors in development.
5. **`audit`:** stop here. Print counts, the findings, and the next command (`/mcp-use:host <host> fix`).
6. **`add` / `fix`:** follow `references/fix-safety.md`. Ask which findings to take on (AskUserQuestion, grouped by severity) unless the user said "all". Apply `auto` fixes with `mcp-use-scan --host <host> --fix`; apply `suggest` and `manual` ones yourself, reading the cited reference first (`${CLAUDE_PLUGIN_ROOT}/skills/host-chatgpt/references/`). One logical change per finding.
7. **Re-audit** (steps 2 to 3 again) and print before/after counts per severity. For `add`, also re-run every other host already declared in settings to prove nothing regressed. Remaining items must each have a reason (waived with a note, manual, or submission-only).
8. **Live check.** Tell the user how to try the app in the host (`${CLAUDE_PLUGIN_ROOT}/skills/verify/references/ladder.md` rung 5). Without access, report it UNVERIFIED with the reason.
