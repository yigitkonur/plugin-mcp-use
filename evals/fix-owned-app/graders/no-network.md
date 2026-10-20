---
type: regex
pattern: 'fetch\(\s*["'']https?:'
match: not_contains
target:
  source: file
  path: app.html
weight: 2
---
