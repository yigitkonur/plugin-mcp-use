# Unverified and conflicting Archestra claims

Archestra's public pages (A1, A2) and the source read as behavioral evidence (A3) do not settle these. State them as unverified; resolve one only by testing a real Archestra and recording the result with its date.

| ID | Claim | Why unsettled | How to settle |
|---|---|---|---|
| U5 | Route A credentials: the viewer's or the installation's | A1 says apps invoke MCP tools with the active viewer's credentials; an earlier skill said an installation uses its own configured upstream credentials | install a server needing per-user auth; open its app as two users; compare |
| U6 | a refresh endpoint (`POST /api/mcp/server/:id/refresh`) for stale tool lists | only in the earlier skill's private sources | after changing tools, find the dashboard action that reloads them; otherwise reconnect or reinstall |
| U7 | `ui/update-model-context` from an installed server's app | nothing in A1, A2 or the source read; the earlier skill said unsupported | call it from a view and watch whether the chat model sees it |
| AR-A07 | an installation viewer without access gets 403 | earlier skill only | open the app as a user without a grant |
| AR-A04 | which CSP forms the host honors (`baseUriDomains`, wildcards, `frameDomains`) | the source read shows CSP taken from the resource item but not every directive | declare each, read the diagnostics |
| B-1 | device permissions on Route B outside `localhost` | docs require a sandbox domain; not testable without one | ask the user whether `ARCHESTRA_MCP_SANDBOX_DOMAIN` is set |
| B-2 | how the real `validate_app` treats edge cases the lint handles lexically (solidus-fused tags, unquoted URLs, protocol-relative hosts) | the corpus encodes the documented intent | compare findings per file; `spikes/S8.md` |
| R-1 | CSP and permission violations shown on the app card or in diagnostics for **installed servers** (Route A) | render diagnostics are documented for Owned Apps; for Route A the source read shows the CSP being read from the resource item | open an installed app whose view loads an undeclared origin; read the card and the console |
| R-2 | `@openai/apps-sdk-ui` and other ChatGPT-styled libraries rendering in Archestra | nothing tested; the F14 render in Archestra is pending (S8) | install F14, open it |
| B-3 | AA04 (unparseable HTML) and AA06 (unknown `uiPermissions` key) being rejected on save | the docs give the key list and limits; the exact rejection behavior was not read | save a file with an unknown key; compare with `validate_app` |
| G-1 | Archestra approval or publishing criteria | none in the pages read; apps are governed by grants, locks and org defaults | ask the user |

Nothing from the earlier skill's private paths is kept. Archestra is AGPL-licensed; this plugin vendors none of its code or tests, only behavior described in its public docs.

Sources: A1, A2, A3.
