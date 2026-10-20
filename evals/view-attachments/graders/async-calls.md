---
type: regex
pattern: \bawait\b[^;\n]*\b(?:add|remove)\(|\b(?:add|remove)\([^)]*\)\s*\.then
target:
  source: file
  path: views/rows/view.tsx
weight: 2
---
