---
type: regex
pattern: '@modelcontextprotocol/sdk|StdioServerTransport'
match: not_contains
target:
  source: file
  path: index.ts
weight: 2
---
