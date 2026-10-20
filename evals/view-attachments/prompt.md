---
name: view-attachments
description: useModelContext attachments are an array and add/remove are async
tags:
- views
- model-context
max_turns: 12
timeout_seconds: 420
allowed_tools:
- Read
- Glob
- Grep
- Skill
---

In my mcp-use view I want two buttons: one attaches the selected row's text as context for the user's next message, the other removes that attachment. Write `views/rows/view.tsx`.
