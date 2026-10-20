---
type: regex
pattern: api[_-]?key|password
flags: i
match: not_contains
target:
  source: file
  path: index.ts
---
