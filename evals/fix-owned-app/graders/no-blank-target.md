---
type: regex
pattern: target\s*=\s*["']?_blank
match: not_contains
target:
  source: file
  path: app.html
---
