---
type: regex
pattern: localStorage|sessionStorage|indexedDB
match: not_contains
target:
  source: file
  path: app.html
weight: 2
---
