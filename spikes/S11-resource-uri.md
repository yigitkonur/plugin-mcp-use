# S11 — is the `ui://` URI stable across builds?
Scaffold `create-mcp-use-app@2.1.0 --template mcp-apps` (mcp-use 2.11.0). `mcp-use build` + `mcp-use start`, read the resource with mcpc, edit the view text, rebuild, read again.
```
build1 uri ui://views/my-view.html len 1211 sha 3d6f3186b0f5
build2 uri ui://views/my-view.html len 1211 sha 22bb8b5f01f8   # after editing view.tsx
```
Dev server resource: same URI, MIME `text/html;profile=mcp-app`, `_meta` keys `ui`, `openai/widgetDescription`, `openai/ui`.
Tool `show-app` `_meta`: `{"ui/resourceUri":"ui://views/my-view.html","ui":{"resourceUri":"ui://views/my-view.html"}}`; **no `openai/outputTemplate`** is emitted.

**Decision:** the URI does not change when the view changes, so a host that caches by URI (OpenAI's chatgpt-ui guide says the URI is a cache key, O1) can serve a stale view. Guidance (CG-R06): after a view change that must reach ChatGPT, rename the view directory (e.g. `my-view-v2`) or disconnect/reconnect the connector. The plugin never edits `openai/outputTemplate` itself; whether ChatGPT needs it beyond `ui.resourceUri` is decided in row 7.

Sources: O1, M2.
