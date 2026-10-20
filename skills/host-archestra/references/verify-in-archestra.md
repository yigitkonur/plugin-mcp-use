# Reading Archestra's results

Both routes end with a render in the user's Archestra; the offline engines only get a project that far. The procedure (asking for the URL, driving the dashboard) is `${CLAUDE_PLUGIN_ROOT}/skills/verify/references/archestra-connect.md`. This file says what the results mean.

## Route B
The authoring tools are built into every Archestra deployment and named `archestra__<tool>` (A4); an agent or MCP gateway must be given them (choose them manually, or choose all and take them off the exclusion list, because built-in tools start excluded). Each acts as the person using it, with that person's permissions.

`validate_app({ appId })` checks the head version without rendering and returns `{ id, version, ok, findings, live }`:
- `ok` is true when no finding has error severity.
- `findings[]` each have only `severity` (`error` or `warning`) and a `message`; there are no rule ids, so compare with `archestra-app-lint` by severity and message wording.
- `live` is the latest render's diagnostics (`status`, `version`, `entries[]`, `renderedAt`). Right after authoring it is normally `no_render_observed`, and the platform's own description treats `ok: true` as sufficient to continue at that point.
`scaffold_app` also returns soft save-time `warnings[]` (the save succeeded); fix them with `edit_app`. `read_app` returns the stored HTML exactly as saved, before the platform injects its SDK and stylesheet, so a lint of it equals a lint of the repo copy. Compare the platform's findings with the lint's and record differences in `spikes/S8.md`.

`get_app_diagnostics` returns the caller's latest render of the current version:
| State | Meaning | Do |
|---|---|---|
| `clean` | rendered with no captured errors, rejections or policy violations | done for this version |
| `errors` | list of captured errors, rejections, console output, policy violations, `hidden` overrides | fix, `edit_app`, open the app again |
| `no_render_observed` | nobody opened this version yet | open the app (`render_app` or `/a/<slug>`), then ask again |
Diagnostics exist only for a version somebody has opened, and the screenshot is attached only for the app's author. Captured errors are also passed to the agent with the viewer's next chat message.

## Route A
There is no `validate_app` for an installed server. The proof is: the app appears in the gallery (labelled as an MCP server app), opening it renders the view, and the view's tool calls return. Capture a screenshot of the rendered view and note anything the app card or the browser console reports; whether the card reports CSP violations for installed servers is unconfirmed (`unverified.md`).

## What counts as passing
| Check | Pass |
|---|---|
| Offline | `archestra-app-lint` (B) or `mcp-use-probe`/`mcp-use-scan --host archestra` (A) report no errors |
| Gate | `validate_app` `ok: true` (B only) |
| Render | `get_app_diagnostics` `clean` (B) or a screenshot of the rendered view with no violations (A) |
| Open items | `unverified.md` entries the change touches are stated as unverified, not assumed |

Sources: A1, A2, A3, A4.
