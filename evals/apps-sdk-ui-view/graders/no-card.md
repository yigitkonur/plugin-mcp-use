---
type: regex
pattern: import\s*\{[^}]*\bCard\b[^}]*\}\s*from\s*["']@openai/apps-sdk-ui|apps-sdk-ui/components/Card
match: not_contains
target:
  source: file
  path: views/order-card/view.tsx
weight: 2
---
