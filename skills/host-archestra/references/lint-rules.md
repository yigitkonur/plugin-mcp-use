# Owned-App lint rules

`archestra-app-lint <file.html>` reports these. IDs are stable; the severity classes mirror the platform: **AA** errors are rejected on save, **AW** warnings are what `validate_app` reports, **AD** advisories come from the SDK reference and render diagnostics. The scan is lexical, like the platform's own: SDK-member checks ignore JS comments, browser-storage and CSS checks do not, and unquoted-URL edge cases are covered by the corpus in `tests/fixtures/f17`.

Fix modes: **auto** = `--fix` edits the file (clean git tree required, a report is written first); **suggest** = `fix-recipes.md` has the change, applied with judgment; **manual** = needs a decision outside the file.

| ID | Sev | Flags | Fix |
|---|---|---|---|
| AA01 | error | script text containing the SDK bootstrap markers (`__ARCHESTRA_APP_SDK_URL__`, `__ARCHESTRA_APP_CONTEXT__`, `PostMessageTransport`) | suggest |
| AA02 | error | `<script src>` pointing at the platform SDK (`archestra-app-sdk`, `ext-apps-app`) | auto |
| AA03 | error | `<link href>` for the platform stylesheet (`archestra-app-base`) | auto |
| AA04 | error | empty input or no markup | manual |
| AA05 | error | HTML over 524,288 bytes | manual |
| AA06 | error | `uiPermissions` key outside camera, microphone, geolocation, clipboardWrite (pass `--ui-permissions`) | manual |
| AW01 | warning | no `<head>` or `<html>` | auto (wraps the fragment in a document) |
| AW02 | warning | script or stylesheet host outside the five CDNs | suggest |
| AW03 | warning | `localStorage`, `sessionStorage` or `indexedDB` in script text | suggest |
| AW04 | warning | `archestra.storage.<method>` without `user` or `shared` | auto (rewrites to `.user`; decide `.shared` yourself) |
| AW05 | warning | `archestra.<name>` that is not a member; names the nearest member | suggest |
| AD01 | warning | `fetch` to an absolute URL, `XMLHttpRequest`, `WebSocket`, `EventSource` | suggest |
| AD02 | warning | `<iframe>` | manual |
| AD03 | warning | `<form>` with no script calling `preventDefault()` | suggest |
| AD04 | warning | `target="_blank"` or `window.open(` | suggest |
| AD05 | warning | `<img>`, `<audio>`, `<video>`, `<source>` `src` or CSS `url()` on a non-allowlisted host | suggest |
| AD06 | advisory | `JSON.stringify(` passed as a storage value | suggest |
| AD07 | advisory | `.set(key, null)` | suggest |
| AD08 | advisory | `archestra.*` used with no `archestra.ready` anywhere | suggest |
| AD09 | advisory | `tools.call("name")` where the name lacks the `server__tool` shape | manual |
| AD10 | advisory | CSS giving a non-`none` `display` to a `[hidden]` selector or to a class or id used on an element with `hidden` | suggest |
| AD11 | advisory | `getUserMedia`, `navigator.mediaDevices`, `navigator.geolocation`, `navigator.clipboard.writeText` | manual (declare `uiPermissions`) |
| AD12 | advisory | `updateModelContext` string literal over 500 characters | suggest |
| AD13 | advisory | CDN URL without a pinned version | suggest |
| AD14 | advisory | `files.save` literal filename with `/`, `\`, a leading dot or over 256 characters | manual |

## What is deliberately not flagged
- Resource tags inside HTML comments.
- Relative, `data:` and `blob:` URLs, and the five CDN hosts in any letter case.
- `tools.call("read_file")` and `"edit_file"` (built-in file tools).
- An `[hidden]` rule whose display is `none`.
- Dynamic names and URLs (`tools.call(name)`, `fetch(url)` with a variable): the lint reads literals only. The platform's render diagnostics catch the rest.

Rule data and limits live in `data/archestra-policy.json`; the engine is `lib/archestra-lint.mjs`. `data/hosts/archestra.checklist.json` groups the rules as `AO-SAVE` (AA), `AO-WARN` (AW) and `AO-DOC` (AD).

Sources: A2, A3.
