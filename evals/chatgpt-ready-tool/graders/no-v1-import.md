---
type: regex
pattern: from\s+["']mcp-use/server["']
match: not_contains
target:
  source: file
  path: index.ts
---
