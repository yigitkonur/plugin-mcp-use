---
type: regex
pattern: archestra-app-sdk|archestra-app-base
match: not_contains
target:
  source: file
  path: app.html
weight: 3
---
