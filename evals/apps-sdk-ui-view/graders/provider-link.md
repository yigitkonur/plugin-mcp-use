---
type: regex
pattern: ^(?![\s\S]*<AppsSDKUIProvider)|<AppsSDKUIProvider[^>]*\blinkComponent\b
target:
  source: file
  path: views/order-card/view.tsx
weight: 2
---
