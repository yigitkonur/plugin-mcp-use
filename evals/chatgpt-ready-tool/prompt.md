---
name: chatgpt-ready-tool
description: 'A ChatGPT-ready mcp-use tool: three explicit annotations, outputSchema, structuredContent, root import'
tags:
- chatgpt
- tools
max_turns: 12
timeout_seconds: 420
allowed_tools:
- Read
- Glob
- Grep
- Skill
---

I'm building an MCP server with mcp-use that ChatGPT will call. Write `index.ts` with one tool, `lookup-order`: it takes an `orderId` string and returns the order's `status` (string) and `total` (number). It only reads data (return fake data). It must be ready for ChatGPT's plugin review.
