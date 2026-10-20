---
type: regex
pattern: ^(?=[\s\S]*\bnotifications\b)(?=[\s\S]*\bunits\b)(?=[\s\S]*\bschema\s*:\s*z\.boolean)(?=[\s\S]*\bschema\s*:\s*z\.enum)(?=[\s\S]*\btitle\s*:)
target:
  source: file
  path: index.ts
weight: 2
---
