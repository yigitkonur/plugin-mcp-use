---
name: server-settings
description: server.settings with the real field shape (schema and title), no label or secret
tags:
- chatgpt
- settings
max_turns: 12
timeout_seconds: 420
allowed_tools:
- Read
- Glob
- Grep
- Skill
---

My mcp-use server should show a native settings screen in ChatGPT with two settings: a boolean "notifications" and a choice "units" (metric or imperial). Write `index.ts` that adds them.
