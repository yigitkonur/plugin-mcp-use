# Fix recipes for Owned-App findings

For rules the engine does not fix by itself (`fix: suggest` or `manual` in `${CLAUDE_PLUGIN_ROOT}/skills/host-archestra/references/lint-rules.md`). Make the smallest change that removes the finding and keeps the app's behavior; re-lint after each. SDK semantics: `${CLAUDE_PLUGIN_ROOT}/skills/host-archestra/references/route-b-sdk.md`.

## Errors (save is rejected)
**AA01** SDK self-bootstrap. Delete the script block that builds a transport or reads the bootstrap markers; replace every use of it with `window.archestra` (`await archestra.ready` first). If the block mixes bootstrap and app logic, keep the app logic and drop only the connection setup.

**AA04 / AA05** Empty or oversized. Restore the file from version history (`read_app` or the repo copy). Over 512 KB: remove inlined data and images (use `files` or a tool's `dataUrl`), and load libraries from a CDN instead of inlining them.

**AA06** Remove the unknown key, or fix its spelling: `camera`, `microphone`, `geolocation`, `clipboardWrite`. These are declared on `scaffold_app`, not in the HTML.

## Warnings
**AW02** Host outside the allowlist. Replace the library with the same package from `cdn.jsdelivr.net` or `unpkg.com` (`https://cdn.jsdelivr.net/npm/<pkg>@<version>/<file>`). If it is not on npm or cdnjs, inline the small part you need, or drop it.

**AW03** Browser storage. 
```js
// before
localStorage.setItem("filter", JSON.stringify(f));
// after: async, private to the viewer
await archestra.storage.user.set("filter", f);
```
Use `storage.shared` only for data every viewer should see. Reads become `(await archestra.storage.user.get("filter"))?.value`.

**AW05** Not an SDK member. The finding names the nearest member (`tool` → `tools`). If none is near, the feature does not exist; use storage, files, tools, llm or ui as listed.

**AD01** Network call. Data must come through an assigned tool:
```js
const tools = await archestra.tools.list();
const name = tools.find((t) => t.name.endsWith("__list_issues")).name;
const issues = await archestra.tools.call(name, { state: "open" });
```
If no assigned tool provides the data, say so; the fix is `set_app_tools` (platform side), not a workaround in the page.

**AD02** Iframe. Render the content in the page (a tool result's text, or `dataUrl` images), or link out with `archestra.ui.openLink(url)`.

**AD03** Form submit.
```js
form.addEventListener("submit", async (e) => { e.preventDefault(); /* read fields, call the SDK */ });
```

**AD04** Popups. `<a href="…" target="_blank">` becomes `<a href="…" data-link>` plus `a.addEventListener("click", (e) => { e.preventDefault(); archestra.ui.openLink(a.href); })`; `window.open(url)` becomes `archestra.ui.openLink(url)`.

**AD05** Media from another host. Get the bytes through a tool: `res.media[0].dataUrl` goes straight into `img.src`. Or use an inline SVG.

## Advisories
**AD06** `set("k", JSON.stringify(v))` → `set("k", v)`; and read back `value` as the object.
**AD07** `set("k", null)` → `delete("k")`.
**AD08** Put `await archestra.ready;` before the first SDK call (inside the async function that uses it).
**AD09** Use the name `tools.list()` returns (`github__list_issues`). The built-in `read_file` and `edit_file` are the exceptions.
**AD10** Remove the `display` from the rule, or put it on an inner wrapper that is not hidden: the platform hides `[hidden]` regardless, and logs the override.
**AD11** Device API in use: the matching `uiPermissions` are declared when the app is created (`scaffold_app`); no documented tool changes them afterwards, so ask the user to recreate the app or ask the platform admin. They also need a sandbox domain outside localhost.
**AD12** Shorten the context line to one sentence under 500 characters.
**AD13** Pin the version: `chart.js` → `chart.js@4.4.1`; for cdnjs the version is in the path (`/ajax/libs/d3/7.9.0/`).
**AD14** Use a plain filename (`q1-report.csv`, not `reports/q1.csv`), at most 256 characters, no leading dot.

Sources: A2, A3.
