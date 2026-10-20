# Route B: authoring loop and where the lint fits

## The platform's loop
Archestra's agents build apps with built-in tools (full names are `archestra__<tool>`, schemas in A4; `edit_app` needs the `baseVersion` you built from, and takes `edits` of exact `old_str` to `new_str`, a `replacementHtml` document, or image replacements):
| Step | Tool |
|---|---|
| clarify and record the spec (up to three questions) | `refine_app` |
| create the app, optionally with first tool assignments and `uiPermissions` | `scaffold_app` |
| change the HTML (targeted replacements or a full document; each edit is a version) | `edit_app`, `read_app` |
| change which tools the app may call | `set_app_tools` |
| run one assigned tool as the viewer and see its real output | `preview_app_tool` |
| check the HTML without rendering | `validate_app` |
| read the last render's result | `get_app_diagnostics` |
| show it, restore a version, share it | `render_app`, `restore_app_version`, `publish_app` |
| move files between a chat and the open app | `copy_file` |

Every new app starts from a stock page, so the first `edit_app` replaces it. HTML is capped at 512 KB.

## Where `archestra-app-lint` fits
It runs the documented rules on a local file before the first save, so a repo copy or an agent's draft is fixed without a round trip. It cannot see the real platform: assigned tools, the sandbox domain, the viewer's grants, or what the browser does at render time. So:
1. Lint and `--fix` the file locally (`/mcp-use:archestra-app fix <file>`).
2. Push it with `edit_app` (or `scaffold_app` for a new one).
3. `validate_app` is the gate; `get_app_diagnostics` after someone opens the app is the proof (`verify-in-archestra.md`).
A disagreement between the lint and the platform is a lint bug to report (`spikes/S8.md` keeps the parity table), not a reason to weaken the rule.

## Writing an app that passes first time
- Start from the skeleton (`${CLAUDE_PLUGIN_ROOT}/skills/archestra-app/assets/skeleton.html`): complete document, one `await archestra.ready`, no network, `hidden` for empty states.
- Get data with `tools.list()` once, find the tool by suffix, call it by the full listed name; handle `auth_required` by showing the link.
- Put state in `storage.user` (settings, drafts) or `storage.shared` (lists everyone sees); read before write, retry on `conflict`.
- Use `.arch-*` classes and the injected variables instead of a custom theme.
- Keep libraries to what a CDN provides, pinned, and only when plain DOM would be clumsy.

Sources: A2, A3, A4.
