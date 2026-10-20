---
type: llm
weight: 3
---

The final message is checked for two migration caveats.
PASS if it tells the user BOTH that (1) mcp-use serves HTTP only, so clients that start the server over stdio must switch to a URL, and (2) zod 3 does not work with mcp-use and zod must be upgraded to 4 (4.2 or newer).
FAIL if either caveat is missing or wrong, for example claiming mcp-use supports stdio or that zod 3 works.
