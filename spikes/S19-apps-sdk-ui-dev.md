# S19 — `@openai/apps-sdk-ui` components in `mcp-use dev`
Date 2026-10-20 · mcp-use 2.11.0, `@mcp-use/cli` 4.5.0, vite 8.0.16 / 8.3.4, react 19.3.1, `@openai/apps-sdk-ui` 0.2.2.
- A view importing any apps-sdk-ui **component** (`AppsSDKUIProvider`, `Badge`, …) failed to render under `mcp-use dev` in two projects (the F14 fixture and a row-5 project built by a headless session). `mcp-use screenshot` → `browser_timeout: View did not become ready in time.`; the dev log: `[vite] (client) [Unhandled error] SyntaxError: The requested module '/.mcp-use/cache/deps/react_jsx-runtime.js?v=…' does not provide an export named 't'`. (The prebundled file does contain `export { require_jsx_runtime as t }`; the failure is a dependency pre-bundling inconsistency in the dev server. One early run of the same fixture rendered, so it can look intermittent.)
- A view importing only `@openai/apps-sdk-ui/theme` (no JSX) renders fine. Clearing `.mcp-use`, pinning vite 8.3.4, and retrying with delays did not help.
- The same view renders after `mcp-use build` + `mcp-use start` (production, Rollup): screenshot written.
- **Fix, verified in both projects (2/2 screenshots each, 0 error lines):** a project-level `vite.config.ts` (mcp-use loads it for views unless `--no-views-config`):
  ```ts
  import { defineConfig } from "vite";
  export default defineConfig({ optimizeDeps: { exclude: ["@openai/apps-sdk-ui"] } });
  ```
- Also verified here: `--wait-for` with an in-view selector (`h2`, `[data-status='ready']`) times out against the **production** build too, while `--wait-for body` succeeds, so the selector is evaluated outside the view's iframe (S16 stands).
