---
type: regex
pattern: '\b(?:label|secret)\s*:'
match: not_contains
target:
  source: file
  path: index.ts
weight: 2
---
