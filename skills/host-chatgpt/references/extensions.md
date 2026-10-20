# ChatGPT extensions in mcp-use

Spec: OpenAI MCP extensions (O6) and Extensions overview (O2); mcp-use API from its 2.11.0 types. **Platform support is O6's "expected support at DevDay launch" table ("Classic ChatGPT is excluded"): a snapshot to re-check, not a guarantee.** Use the `openai-docs` MCP server for current status.

| Extension | What it does | mcp-use | Platforms (O6 table) |
|---|---|---|---|
| Global entrypoint | launches the app from ChatGPT's top-level launcher; the tool must accept `{}`; opens fullscreen | `view.entrypoints: [{ type: "global" }]` | all |
| Thread entrypoint | launches in a conversation; accepts `{}`; one instance per thread | `{ type: "thread" }` | all |
| File entrypoint | opens as the viewer for files with given extensions; the tool receives `{ file: { name, resourceUri, … } }`; `resourceUri` is opaque, intercepted by ChatGPT | `{ type: "file", extensions: [".csv"] }` (extensions start with ".") | desktop only |
| Structured settings | native settings screen from a read tool and an update tool | `server.settings({...})` | all |
| Deep links | `https://chatgpt.com/plugins/<plugin-id>/app/<tool-name>?path=<encoded-app-relative-url>`; the app reads it from `hostContext["openai/deepLink"]` | `useDeepLink()` → `{ url }` | not Android |
| Composer @-mentions | search tool backing mentions in the composer | `server.mentions({...})` (mcp-use ≥ 2.9.0) | desktop only |
| Extended model context | `ui/update-model-context` extensions; each call replaces the app instance's prior context; no image content yet on web | `useModelContext()` (`${CLAUDE_PLUGIN_ROOT}/skills/mcp-apps/references/hooks.md`) | web*, iOS*, desktop, Android |
| Extended forms | `OpenAIForm` through elicitation; OpenAI-registered servers need multi-round-trip requests (MRTR) | `inputRequired.elicit` (`${CLAUDE_PLUGIN_ROOT}/skills/mcp-use-server/references/elicitation.md`) | desktop; web*; no mobile |
| Plugin onboarding | `extensions["com.openai"].onboardingSkill` in the plugin manifest | n/a (plugin packaging) | all |

The deep-link format is `?path=`, not `?route=`. Entrypoint tools are invoked without model-chosen arguments, and `visibility` is ignored when a tool is invoked as an entrypoint.

## Entrypoints
<!-- fixture: chatgpt-entrypoints -->
```ts
import { MCPServer } from "mcp-use";
import { z } from "zod";

const server = new MCPServer({ name: "viewer", version: "1.0.0" });

// Global/thread entrypoints: the input schema must accept {}.
export const openDashboard = server.tool(
  {
    name: "open-dashboard",
    title: "Open dashboard",
    description: "Open the dashboard. Read-only.",
    inputSchema: z.object({}),
    outputSchema: z.object({ ready: z.boolean() }),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    view: { name: "dashboard", entrypoints: [{ type: "global" }, { type: "thread" }] },
  },
  async () => ({ content: [{ type: "text", text: "Dashboard ready." }], structuredContent: { ready: true } }),
);

// File entrypoint: the input is { file: { name, resourceUri } }.
export const openCsv = server.tool(
  {
    name: "open-csv",
    title: "Open CSV",
    description: "Show a CSV file as a table. Read-only.",
    inputSchema: z.object({ file: z.object({ name: z.string(), resourceUri: z.string() }) }),
    outputSchema: z.object({ file: z.object({ name: z.string(), resourceUri: z.string() }) }),
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    view: { name: "csv-viewer", entrypoints: [{ type: "file", extensions: [".csv", ".tsv"] }] },
  },
  async ({ file }) => ({ content: [{ type: "text", text: `Opened ${file.name}` }], structuredContent: { file } }),
);

export default server;
```

## Settings (`server.settings`)
Fields are `{ schema, title, description? }` (a primitive Standard Schema: boolean, string, string enum, number or integer). `read(ctx)` and `update(set, ctx)` **both return every effective value**. `layout` groups use `kind: "group"` with items of `{ kind: "property", property }` or `{ kind: "tool", tool }` (a `title` on a tool item is deprecated and ignored: the label comes from the referenced tool's own `title`, O6). There is no `type`, `label`, `default`, `secret`, or `void` return. Persistence and authorization are yours. mcp-use registers the read and update tools (named `settings.read` and `settings.update`): observed on 2.11.0 (S26), the read tool carries only `readOnlyHint: true`, the update tool carries no annotations, and neither has a description, so the CG-T01 and CG-T05 probes flag them as warnings.
**Never put credentials here** (API keys, passwords, one-time codes are restricted data, O4).

<!-- fixture: chatgpt-settings -->
```ts
import { MCPServer } from "mcp-use";
import { z } from "zod";

const server = new MCPServer({ name: "prefs", version: "1.0.0" });

let current = { units: "metric" as "metric" | "imperial", notifications: true };

server.settings({
  fields: {
    units: { schema: z.enum(["metric", "imperial"]), title: "Units", description: "How to show measurements" },
    notifications: { schema: z.boolean(), title: "Notifications" },
  },
  layout: [
    {
      kind: "group",
      title: "Preferences",
      items: [
        { kind: "property", property: "units" },
        { kind: "property", property: "notifications" },
      ],
    },
  ],
  read: () => current,
  update: (set) => {
    current = { ...current, ...set };
    return current;
  },
});

export default server;
```
(The module-level `current` is for the example only; real settings belong in per-user storage keyed by `ctx.auth`.)

### Wrong: the older note's shape (rejected by the compiler)
<!-- fixture-bad: chatgpt-settings-old-shape -->
```ts
import { MCPServer } from "mcp-use";

const server = new MCPServer({ name: "bad", version: "1.0.0" });

server.settings({
  fields: { apiKey: { type: "string", label: "API key", secret: true } },
  read: async () => ({ apiKey: "" }),
  update: async () => {},
});

export default server;
```

## Mentions
The search tool is read-only and visible to the app (mcp-use sets `ui.visibility` to `["app"]`). Arguments `{ query }`, result `{ items: ResourceLink[] }`. Observed on 2.11.0 (S26): the tool carries the **deprecated** form `_meta["openai/extensions"]["mentions/search"]: {}` and `initialize` advertises no `openai/mentions` capability; O6 says the old form keeps working while that capability is absent, so mentions work today but may need an mcp-use update when ChatGPT drops it.
<!-- fixture: chatgpt-mentions -->
```ts
import { MCPServer } from "mcp-use";

const server = new MCPServer({ name: "notes", version: "1.0.0" });

export const searchNotes = server.mentions({
  name: "search-notes",
  title: "Search notes",
  description: "Find notes to mention in the composer.",
  search: async ({ query }) => ({
    items: [{ type: "resource_link", uri: `notes://${encodeURIComponent(query)}`, name: query }],
  }),
});

export default server;
```

## Deep links
<!-- fixture: chatgpt-deeplink -->
```tsx
import { useDeepLink } from "mcp-use/react";

export default function Router() {
  const { url } = useDeepLink(); // app-relative URL, e.g. "/items?tag=hardware"; undefined without a link
  return <main data-route={url ?? "/"}>{url ?? "home"}</main>;
}
```
mcp-use normalizes older host `path`/`query` payloads to the same URL shape. Route parsing and authorization stay in the app.

## Platform caveats to tell the user
File entrypoints and mentions are desktop only; deep links are not on Android; forms need MRTR and are not on mobile; check O6's table for web and iOS asterisks before promising a surface.

Sources: O2, O4, O6, M2, S26.
