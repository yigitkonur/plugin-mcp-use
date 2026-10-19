# Resources and prompts

Checked against `dist/resources.d.ts`, `dist/prompts.d.ts`, `dist/completable.d.ts` (2.11.0).

## Resources
- `server.resource(definition, callback)`: one stable URI. The definition needs `name` and `uri`; `title`, `description`, `mimeType`, `annotations`, `_meta` are optional. The callback is `(uri: URL, ctx)` and returns `{ contents: [...] }`.
- `server.resourceTemplate(definition, callback)`: a URI family. The definition has a top-level `uriTemplate` and an optional `complete` map (variable name → list or callback). The callback is `(uri, params, ctx)`; template variables are typed from the template string.
- Every `contents` entry carries its `uri` and either `text` or a base64 `blob`.
- Views are served as resources by the framework (`ui://views/<name>.html`, MIME `text/html;profile=mcp-app`). Do not register them by hand.

<!-- fixture: resources -->
```ts
import { MCPServer } from "mcp-use";

const server = new MCPServer({ name: "docs", version: "1.0.0" });

server.resource(
  { name: "readme", uri: "docs://readme", title: "README", mimeType: "text/markdown" },
  async (uri) => ({
    contents: [{ uri: uri.href, mimeType: "text/markdown", text: "# Docs\nHello." }],
  }),
);

server.resourceTemplate(
  {
    name: "doc-page",
    uriTemplate: "docs://pages/{slug}",
    title: "Doc page",
    mimeType: "text/markdown",
    complete: { slug: ["intro", "install", "faq"] },
  },
  async (uri, { slug }) => ({
    contents: [{ uri: uri.href, mimeType: "text/markdown", text: `# ${String(slug)}` }],
  }),
);

export default server;
```

## Prompts
- `server.prompt(definition, callback)`. Prompt arguments use **`schema`** (tools use `inputSchema`). The callback returns `{ messages: [...] }`.
- `completable(schema, valuesOrCallback)` gives clients suggestions for one argument without restricting other valid strings.

<!-- fixture: prompt-completable -->
```ts
import { MCPServer, completable } from "mcp-use";
import { z } from "zod";

const server = new MCPServer({ name: "prompts", version: "1.0.0" });

server.prompt(
  {
    name: "review-code",
    description: "Ask for a code review",
    schema: z.object({
      language: completable(z.string(), ["typescript", "javascript", "go"]),
      code: z.string().describe("The code to review"),
    }),
  },
  async ({ language, code }) => ({
    messages: [
      { role: "user", content: { type: "text", text: `Review this ${language} code:\n\n${code}` } },
    ],
  }),
);

export default server;
```

## Notes
- Resources, templates and prompts on an OAuth server with `mixedAuth: true` always require sign-in (`auth.md`).
- Subscriptions and `notify*Changed()` are listener-bound and not durable over stateless HTTP (`advanced.md`).

Sources: M1, M2.
