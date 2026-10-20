---
type: regex
pattern: \.status\s*===?\s*["'](?:pending|ready|error)["']
target:
  source: file
  path: views/order-card/view.tsx
---
