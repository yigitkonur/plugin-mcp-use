# S26 — checks made while fixing the independent review of the host references

A read-only reviewer compared the host references with the saved vendor pages and found 28 problems (4 contradicted, 11 overstated or unsupported, 4 near-verbatim copies, misplaced items). Where the saved pages could not decide a statement, it was checked here (2026-10-20).

## `server.settings` generated tools (mcp-use 2.11.0)
Server with `server.settings({ fields: { units, notifications }, read, update })`, `mcp-use dev`, `mcp-use-probe --host chatgpt`:
```
settings.read   annotations {"readOnlyHint": true}   no _meta
settings.update annotations (none)                    no _meta
WARNING CG-T01 tool:settings.read  Missing explicit boolean destructiveHint, openWorldHint
WARNING CG-T05 tool:settings.read  Tool has no description.
WARNING CG-T01 tool:settings.update Missing explicit boolean readOnlyHint, destructiveHint, openWorldHint
WARNING CG-T05 tool:settings.update Tool has no description.
```

## Mentions advertising (mcp-use 2.11.0)
`server.mentions({ name: "search-notes", ... })`, `initialize` and `tools/list` over HTTP:
```
initialize capabilities: {"logging":{},"tools":{"listChanged":true},"prompts":{"listChanged":true},"resources":{"listChanged":true,"subscribe":true}}
tool search-notes annotations {"readOnlyHint": true}  _meta {"openai/extensions": {"mentions/search": {}}, "ui": {"visibility": ["app"]}}
```
So only the deprecated `mentions/search` extension form is emitted and no `openai/mentions` capability is advertised (U12 in the host matrix).

## `preferredDisplayMode`
A view exporting `viewConfig = { displayModes: ["inline","fullscreen"], preferredDisplayMode: "inline" } satisfies ViewConfig`; resource metadata read through `mcp-use-probe`: `_meta["openai/ui"] = { availableDisplayModes: ["inline","fullscreen"], preferredDisplayMode: "inline" }`. OpenAI's extensions spec: "If `availableDisplayModes` includes both `inline` and `fullscreen`, ChatGPT defaults to `fullscreen` unless `preferredDisplayMode` specifies otherwise." That ChatGPT honors the emitted preference was not tested (S7 only observed the default: a side panel).

## `@openai/apps-sdk-ui@0.2.2` (installed package)
- `package.json` `peerDependencies`: `{"react": "^18.0.0 || ^19.0.0", "tailwindcss": "^4.0.10"}`.
- `dist/types/components/Icon/index.d.ts`: 745 named exports (the Icon directory has 755 `svg/*.d.ts` files, some not exported by name).
- `dist/types/components/Menu/Menu.d.ts` declares `Link: MenuLink` typed with `AppsSDKUI.LinkComponent`, so `Menu.Link` takes the provider's link component.
- Prop rules in `apps-sdk-ui.md` (`Button` needs `color`, Badge colors, Avatar `size` number, Checkbox `orientation`) are enforced by the compile fixtures `sdkui-*` (good ones compile, bad ones are rejected) in CI.

Not settled (kept as unverified or softened): whether the OpenAI "own registrable domain" rule is exclusive (the guidelines permit it and limit third-party embeds to essential cases, so text now says "normally"); whether Archestra shows CSP violations for installed servers; AA04/AA06 save-time rejection.
