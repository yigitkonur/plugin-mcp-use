---
name: apps-sdk-ui-view
description: 'A ChatGPT view with Apps SDK UI: provider linkComponent, no Card, Button color, useToolContext'
tags:
- chatgpt
- views
max_turns: 12
timeout_seconds: 420
allowed_tools:
- Read
- Glob
- Grep
- Skill
---

My mcp-use ChatGPT app has a tool `lookup-order` (output: `status` string, `total` number). Write the view `views/order-card/view.tsx`. Use the `@openai/apps-sdk-ui` components: show the status in a Badge and add a primary "Track order" Button. Read the data with the mcp-use hooks.
