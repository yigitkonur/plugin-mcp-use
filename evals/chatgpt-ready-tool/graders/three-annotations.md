---
type: regex
pattern: ^(?=[\s\S]*readOnlyHint:\s*true)(?=[\s\S]*destructiveHint:\s*false)(?=[\s\S]*openWorldHint:\s*false)
target:
  source: file
  path: index.ts
weight: 3
---
