---
type: regex
pattern: ^(?=[\s\S]*(?:\bawait\b[^;\n]*\badd\(|\badd\([^)]*\)\s*\.then))(?=[\s\S]*(?:\bawait\b[^;\n]*\bremove\(|\bremove\([^)]*\)\s*\.then))
target:
  source: file
  path: views/rows/view.tsx
weight: 2
---
