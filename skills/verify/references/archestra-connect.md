# Rung 5 for Archestra: use the user's own Archestra

**Never install, start or configure an Archestra instance** (no Docker, no Helm, no local build). If the user has none, report the rung UNVERIFIED with that reason and stop. Archestra's UI was not observed when this was written; if a step does not match what the dashboard shows, read the docs MCP server (`archestra-docs`, read-only tools) and adapt, and record what you saw.

## 1. Ask for what you need, once
Ask the user (AskUserQuestion or one plain question):
- the Archestra base URL (for example `https://archestra.example.com`);
- whether the browser session for it is already signed in (if not, they sign in themselves; never ask for or type a password you were not handed as a test account);
- for an Owned App: the app id or permission to create one; for Route A: permission to add a server to the MCP registry and to delete it afterwards.

## 2. Reach it
`curl -s -m 20 -o /dev/null -w '%{http_code}' <url>` should answer 200 or a redirect to sign-in. Anything else: UNVERIFIED, quote the status. Then open it with the `ego-browser` skill (read `~/.claude/skills/ego-browser/SKILL.md` first) and take a screenshot of the signed-in start page as evidence.

## 3a. Route B: an Owned App
1. Lint locally first: `archestra-app-lint <file> --json` must show no errors.
2. Get the HTML into an app. The built-in tools are named `archestra__scaffold_app`, `archestra__edit_app`, `archestra__validate_app`, `archestra__get_app_diagnostics` (A4) and need an agent or MCP gateway that has been given them. Choose the path the instance allows, in this order: (a) the dashboard's app editor; (b) a chat with an agent that has the tools, asking it to create the app from the file's contents with `replacementHtml` and report `validate_app`; (c) an MCP gateway the user already runs. If none exists, ask the user to create one (a step only they can approve) rather than building infrastructure.
3. Run `validate_app`; paste `ok`, every finding (`severity`, `message`) and `live.status`.
4. Open the app (the gallery `/apps`, or `/a/<slug>`), wait for it to render, screenshot it, then call `get_app_diagnostics`; paste `status` and `entries`.
5. Write the parity table (lint finding versus platform finding, matched by severity and message) to `spikes/S8.md`.
6. Clean up what you created: delete the test app (`delete_app` or the app menu) unless the user wants to keep it.

## 3b. Route A: an installed mcp-use server
1. Run the project with a public URL: `npx mcp-use dev --tunnel --no-open --no-inspector --port <port>`; the log prints `Tunnel: https://<name>.tunnel.mcp-use.run/mcp`. Fixture data only; the tunnel exposes the whole server.
2. `mcp-use-probe --url <tunnel url> --host archestra` must show no errors first.
3. In the dashboard open the MCP registry (docs: `/docs/mcp/servers`), add a remote MCP server with that URL, wait for its tools to load, and assign what the user allows.
4. Find the app in the gallery (it is labelled as an MCP server app), open it, and trigger the tool. Screenshot the rendered view and note anything the app card reports (CSP violations, auth prompts).
5. If the view needs a signed-in tool credential, note which identity ran it; this is the evidence for the unverified credential question (`${CLAUDE_PLUGIN_ROOT}/skills/host-archestra/references/unverified.md`, U5).
6. Clean up: remove the server from the registry, delete any test chat, stop `mcp-use dev`. Leave no tunnel running.

## 4. Report
A table of what ran and what each step returned (status codes, `validate_app` output, diagnostics status, screenshot paths), then every claim from `unverified.md` that the run settled or contradicted. If the render needs an LLM provider key that the instance lacks, ask the user; do not add one yourself.

Sources: A1, A2, A4.
