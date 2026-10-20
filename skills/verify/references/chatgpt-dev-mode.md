# Rung 5 for ChatGPT: try the app in ChatGPT

Observed end to end on 2026-10-20 (S7). The ChatGPT UI changes often: if a step does not match, read the current OpenAI docs through the `openai-docs` MCP server (`search_openai_docs`) and adapt. Everything here is a manual step for the user, or for an agent with a browser they have authorized; never do it without the user's go-ahead, because it connects a public tunnel to their ChatGPT account.

1. **Serve the project through a public tunnel.** `npx mcp-use dev --tunnel --no-open --no-inspector --port <port>`; the log prints `Tunnel: https://<name>.tunnel.mcp-use.run/mcp`. The tunnel exposes the whole server: use fixture data only. The Inspector is not reachable through it (404). If views use `@openai/apps-sdk-ui` components, the project needs the `vite.config.ts` from `${CLAUDE_PLUGIN_ROOT}/skills/host-chatgpt/references/apps-sdk-ui.md`.
2. **Probe the tunnel first** so a failure is not blamed on ChatGPT: `mcp-use-probe --url <tunnel url> --host chatgpt --ua chatgpt`.
3. **Add it in ChatGPT.** Settings has no developer-mode switch in current accounts. Open **Plugins → Add → Add custom MCP server**, fill Name, Description, Server URL (the tunnel URL), Authentication (`No authentication` for an open dev server, `OAuth` or `OAuth or no authentication` for a protected one), tick the risk acknowledgement, **Create as a plugin**, then **Connect** on the consent dialog (it says ChatGPT may share memories and chats with the app).
4. **Call it.** Start a new chat and ask for the tool by name ("Use the <plugin name> plugin to <do the tool's job>"). Expect "Opened <tool title>" and the view in a side panel or inline. Look at the rendered view yourself (screenshot) and confirm it shows the real data, not a loading state, in dark and light.
5. **Refresh after changes.** The server's `ui://` URI is a cache key and does not change when a view is rebuilt (S11): use the plugin's **Refresh tools** control, or delete and re-add the plugin, after changing a view.
6. **Clean up.** Delete the test chat, open the plugin's settings and choose **Delete app**, then stop `mcp-use dev`. Do not leave a tunnel running.

What was verified: a view bound with `view: { name }` and nothing else (no `openai/outputTemplate`, no `ui.domain`) rendered in ChatGPT from an `mcp-use dev --tunnel` server, with Apps SDK UI components, in about 20 seconds from prompt to card. What was not: picture-in-picture, mobile, entrypoints, settings, deep links, review submission.

Sources: S7, S11, S19, O1.
