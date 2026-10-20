---
name: start
description: Show what the mcp-use plugin can do in this project: detected stack, MCP signals, versions, hosts, and the next command to type.
disable-model-invocation: true
---

# /mcp-use:start

Report what applies to this project. Do not edit anything except the optional settings file in step 4.

1. Run `mcp-use-detect --json` (a bare command; the plugin's `bin/` is on PATH). Read `result.scenario`, `result.versions`, `result.hosts`, `result.entry`, `result.views` and `next_actions`.
2. Say in at most five lines:
   - `NONE`: no MCP server found here. A new server is one command away: `/mcp-use:new`.
   - `OUT_OF_SCOPE` (exit code 4, or `stack.node` false): "This plugin targets Node/TypeScript MCP servers (mcp-use). Detected: <`stack.other`>." For Python add: "mcp-use has a Python server SDK without MCP Apps support: https://docs.mcp-use.com/python/server". Stop; edit nothing.
   - `ADD_APPS`, `HAS_VIEWS`, `ADD_HOST`, `IMPROVE_HOST`, `OWNED_APP`: one line on what was found (server entry, mcp-use version against `known_good`, view names, hosts inferred or declared).
   - `MIGRATE`, `LEGACY_V1`: say this is an official-SDK or legacy mcp-use server and name `/mcp-use:migrate` only if it appears in `next_actions` (it ships in a later plugin version).
3. Print `next_actions` exactly as returned (`cmd` and `why`). Only commands in that list exist in the installed plugin version.
4. If hosts are empty and views exist, offer to record them: create `.mcp-use-plugin/settings.md` with frontmatter `hosts: [chatgpt]` and/or `archestra` (Archestra cannot be inferred from code, so it must be declared), and suggest adding `.mcp-use-plugin/` to `.gitignore`; edit `.gitignore` only if the user agrees. Ask first.
5. Mention the knowledge that loads on its own (`mcp-use-server`, `mcp-apps`), and the off switch `MCP_USE_PLUGIN=off`.
