---
type: regex
pattern: \bfetch\s*\(|XMLHttpRequest|new\s+WebSocket|new\s+EventSource|sendBeacon
match: not_contains
target:
  source: file
  path: app.html
weight: 2
---
