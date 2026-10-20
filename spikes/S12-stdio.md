# S12 — stdio servers in mcp-use 2.11.0
- `grep -l StdioServerTransport node_modules/mcp-use/dist/*.js` → no hits; no server-side `stdio` in the `.d.ts` files. The changelog's stdio entries are all client connectors.
- The skill's pre-collapse notes (`d83925f7:…/09-transports/05-no-stdio-and-sse-history.md`) say v2 serves Streamable HTTP only.

**Decision:** migrating a stdio SDK server means the result is HTTP only. `migrate` must say so before porting, ask the user how their clients will connect (a URL instead of a `command` entry), and snapshot the old server over `--stdio` and the new one over HTTP. No bridge is recommended unless verified.
