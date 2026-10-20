---
type: regex
pattern: outputSchema\s*:\s*z\.object\(\{[\s\S]*?\bstatus\b[\s\S]*?\btotal\b
target:
  source: file
  path: index.ts
weight: 2
---
