---
type: regex
pattern: ^(?=[\s\S]*server\.tool\(\s*\{)(?=[\s\S]*name\s*:\s*["']lookup-sku["'])(?=[\s\S]*name\s*:\s*["']adjust-stock["'])
target:
  source: file
  path: index.ts
weight: 2
---
