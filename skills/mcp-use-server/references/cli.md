# `mcp-use` CLI

Verified against `@mcp-use/cli@4.5.0` by running `--help` and the commands below (2026-10-20). The CLI is installed by `mcp-use`, so `npx mcp-use <command>` works in any project. Boolean flags take no value (`--tunnel`, never `--tunnel=false`; the CLI answers `--tunnel does not take a value`, exit 2).

| Command | Use |
|---|---|
| `mcp-use dev [-p <port>] [--host h] [--entry f] [--path dir] [--mcp-dir d] [--views-dir d] [--tunnel] [--no-open] [--no-inspector]` | dev server with view hot reload and the Inspector. Exit 0 started, 2 bad arguments, 1 startup failure. Prints the MCP endpoint (default `http://localhost:3000/mcp`). |
| `mcp-use typecheck [-- <tsc options>]` | regenerates `mcp-env.d.ts` and runs the project's TypeScript compiler. |
| `mcp-use build [--source-maps] [--inline] [--no-views-config]` | builds `.mcp-use/build/index.js` and bundles views. Exit 1 on failure (including malformed `skills/`). |
| `mcp-use start [-p] [--with-inspector]` | serves the production build. |
| `mcp-use client connect <name> <url>` | saves a server. Then `mcp-use client <name> tools list`, `tools describe <tool>`, `tools call <tool> key=value key:=<json> [--json]`, `resources list`, `resources read <uri>`, `prompts list`, `prompts get`, `auth login\|status\|logout`. `mcp-use client list` and `remove <name>` manage saved servers. |
| `mcp-use screenshot (--server <name> \| --mcp <url>) --tool <tool> [key=value…] [--theme light\|dark] [--width px] [--height px] [--device-scale-factor n] [--delay ms] [--timeout ms] [--output file.png] [--json]` | calls a view-backed tool and saves the rendered view as a PNG. |
| `mcp-use deploy [path] [--no-github] [--env K=V] [--yes] [--json]` | deploys to Manufact Cloud. It mutates remote state; never run it without the user asking. |
| `mcp-use login`, `logout`, `whoami`, `org`, `servers`, `deployments` | cloud account commands. |

## Things that bite
- `mcp-use client` and `mcp-use screenshot` need the optional package **`@mcp-use/client`** in the project. Without it: `{"error":{"code":"client_install_required",…}}`. Install it as a devDependency (ask first).
- `screenshot --wait-for <selector>` is evaluated in the **outer page**, not inside the view's iframe: `--wait-for body` works, `--wait-for "[data-status='ready']"` times out with `browser_timeout`. Use `--delay 1500` instead.
- A view that paints no background looks black with dark text in the light-theme PNG (the capture host's backdrop shows through). Judge light-mode contrast only for views that paint their own surface.
- Default screenshot width is 768 px (an inline ChatGPT card).
- `mcp-use dev --tunnel` opens a public URL to your local server. Do not use it with real credentials or data.
- `create-mcp-use-app` is a separate package: `npx create-mcp-use-app@latest <name> --template mcp-server|mcp-apps|blank [--npm|--pnpm|--bun] [--install|--no-install] [--skills|--no-skills] [--sdk-version <v>]`. `--skills` copies the official `mcp-apps-builder` skill into `.claude/skills`, `.agents/skills` and `.cursor/skills`.

## Two layers of verification
1. Protocol: tools, resources, prompts and skills through `mcp-use client` (or `mcpc`). Exit codes and JSON, no model involved.
2. Model: does an LLM pick the right tool and does the view render? That needs a host (Inspector chat, ChatGPT developer mode, Archestra). `/mcp-use:verify` walks both.

Sources: M1, S16.
