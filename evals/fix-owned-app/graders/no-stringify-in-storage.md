---
type: regex
pattern: \.set\(\s*[^,()]+,\s*JSON\.stringify
match: not_contains
target:
  source: file
  path: app.html
---
