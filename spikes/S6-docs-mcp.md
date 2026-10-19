# S6 — the three docs MCP servers inside a plugin
Toy `.mcp.json` with `mcp-use-docs`, `openai-docs`, `archestra-docs` (type http, no auth).
- `claude plugin details`: "MCP servers (3) … (tool schemas resolved at runtime; not counted)".
- Session `init`: `plugin:toy:mcp-use-docs` connected, `plugin:toy:openai-docs` connected, `plugin:toy:archestra-docs` pending at init, later usable. Tools namespaced `mcp__plugin_toy_mcp-use-docs__search_mcp_use`, `…openai-docs__search_openai_docs`, etc.
- Real calls (one each) succeeded: mcp-use `search_mcp_use("useCallTool")` → "Title: useCallTool() Link: https://docs.mcp-use.com/typescript/api-reference/react/usecalltool"; OpenAI `search_openai_docs("outputTemplate")` → `{"hits":[{"url":"https://developers.openai.com/plugins/build/chatgpt-ui#…`; Archestra `search_docs("validate_app")` → "Archestra MCP Server › Apps … `set_app_lock`".
- Tool schemas were deferred: the model used `ToolSearch` to load them before calling.

**Decision:** ship all three. Cost is near zero until used. Skills name tool short forms (`search_mcp_use`, `search_openai_docs`, `search_docs`); the full prefix is `mcp__plugin_mcp-use_<server>__`.
