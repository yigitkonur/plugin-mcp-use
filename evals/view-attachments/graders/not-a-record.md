---
type: regex
pattern: Object\.(?:entries|keys|values)\(\s*attachments\s*\)|attachments\[\s*["'`]
match: not_contains
target:
  source: file
  path: views/rows/view.tsx
weight: 3
---
