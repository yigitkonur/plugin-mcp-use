# S24 — `allowedOrigins` / `allowedHosts` take hostnames, not URLs

Question: the config reference showed `allowedOrigins: ["https://chatgpt.com"]`. Does that allow requests from `https://chatgpt.com`?

Types (`mcp-use@2.11.0 dist/config.d.ts`): "Extra allowed origin hostnames for Origin-header validation (port-agnostic, additive to the localhost-class origins)"; the example is `allowedOrigins: ["app.example.com"]`. `allowedHosts`: "Extra allowed hostnames ... e.g. `["api.example.com"]`".

Run (2026-10-20, `mcp-use dev --port 3645`, server with `allowedOrigins: ["https://url-form.example.com", "hostname-form.example.com"]`, `POST /mcp` `tools/list`):
```
Origin https://url-form.example.com       -> HTTP 403 {"error":{"code":-32000,"message":"Invalid Origin: url-form.example.com"}}
Origin https://hostname-form.example.com  -> HTTP 200
Origin https://evil.example.org           -> HTTP 403 Invalid Origin: evil.example.org
Origin <none>                             -> HTTP 200
```
The deploy-restoration subagent reproduced the same on `mcp-use start` and for `allowedHosts` (a URL there rejects its own host).

Decision: examples and prose use hostnames. Rule STK-14 flags a URL (`http://` or `https://`) inside `allowedOrigins` or `allowedHosts`.
