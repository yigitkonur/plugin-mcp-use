---
name: verify
description: Run the mcp-use verification ladder: typecheck, build, dev server, real tool calls over MCP, and view screenshots.
argument-hint: "[--tool <name>] [--host chatgpt|archestra]"
disable-model-invocation: true
---

# /mcp-use:verify

Arguments: `$ARGUMENTS`. Prove the server works by running it, not by reading it. Read `${CLAUDE_PLUGIN_ROOT}/skills/verify/references/ladder.md` and run the rungs in order in the project root (the directory with the server entry). Give every command a time limit. After each rung, quote what the command printed (exit status, first lines, file paths). A crash, a timeout, or two minutes of silence fails the rung: fix and rerun that rung, up to three fixes with a new hypothesis each.

End with a table: rung, command, result, and anything UNVERIFIED with the reason (for example "no ChatGPT developer-mode access"). Rungs 1 to 4 ship in 0.1.0; the host rung is guided in later versions.
