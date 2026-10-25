---
name: verify
description: Run the mcp-use verification ladder: typecheck, build, dev server, real tool calls over MCP, and view screenshots.
argument-hint: "[--tool <name>] [--host chatgpt|archestra]"
disable-model-invocation: true
---

# /mcp-use:verify

> In Codex: `bin/` is not on PATH and `${CLAUDE_PLUGIN_ROOT}` is unset. The plugin root is two folders above this file: run engines as `node <root>/bin/<name>` and read `${CLAUDE_PLUGIN_ROOT}` as `<root>`. `/mcp-use:<x>` means the skill `<x>`.

Arguments: `$ARGUMENTS`: `--tool <name>` limits rungs 3 and 4 to that tool; `--host chatgpt|archestra` picks the rung 5 guide (without it, rung 5 is offered, not run). Prove the server works by running it, not by reading it. Read `${CLAUDE_PLUGIN_ROOT}/skills/verify/references/ladder.md` and run the rungs in order in the project root (the directory with the server entry). Give every command a time limit. After each rung, quote what the command printed (exit status, first lines, file paths). A crash, a timeout, or two minutes of silence fails the rung: fix and rerun that rung, up to three fixes with a new hypothesis each.

End with a table: rung, command, result, and anything UNVERIFIED with the reason (for example "no ChatGPT developer-mode access"). Rung 5 (the host) is guided and needs the user's go-ahead: ChatGPT through `references/chatgpt-dev-mode.md`, Archestra through `references/archestra-connect.md`.
