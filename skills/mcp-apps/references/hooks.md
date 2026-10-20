# React hooks and components (`mcp-use/react`)

Signatures are copied from `node_modules/mcp-use/dist/react/**/*.d.ts` (2.11.0). All imports come from `"mcp-use/react"`. Tool names in generics (`useToolContext<"show-product">`) resolve through `mcp-env.d.ts`, so export every tool and run `mcp-use typecheck` first.

## Call and tool hooks
| Hook | Signature | Notes |
|---|---|---|
| `useToolContext<Name>()` | `{ status: "pending" \| "ready" \| "error"; toolInput; toolOutput; content; meta; error }` | `views.md` |
| `useCallTool(ref \| name)` | `{ callTool(args): Promise<CallToolSuccess<Result>>; data; error: Error \| undefined; isPending }` | no `isError`, `isSuccess`, or `reset` |
| `useDynamicTool<Args, Result>(name)` | same handle, untyped | for tools created at runtime |
| `useViewTool(definition, handler)` | registers a client-side tool for the model while the view is mounted | `definition`: `name`, `title`, `description`, `inputSchema`, `outputSchema`, `annotations`, `enabled?` |
| `useSendFollowUp()` | `(args: { prompt: string }) => Promise<void>` | adds a user turn to the conversation |
| `useOpenExternal()` | `(args: { url: string }) => Promise<void>` | the host opens the URL |
| `useSendSizeChanged()` | `(size: { width?; height? }) => Promise<void>` | explicit resize; `autoResize` usually suffices |

<!-- fixture: hook-call-tool -->
```tsx
import { useCallTool, useOpenExternal, useSendFollowUp, useViewState } from "mcp-use/react";

export default function StockEditor() {
  const updateStock = useCallTool("update-stock");
  const openExternal = useOpenExternal();
  const sendFollowUp = useSendFollowUp();
  const [draft, setDraft] = useViewState({ quantity: 0 });

  const save = async () => {
    try {
      const result = await updateStock.callTool({ sku: "SKU-100", quantity: draft.quantity });
      await sendFollowUp({ prompt: `Stock for ${result.structuredContent.sku} is now ${result.structuredContent.quantity}` });
    } catch {
      // updateStock.error holds the failure for display
    }
  };

  return (
    <div>
      <input
        type="number"
        value={draft.quantity}
        onChange={(e) => setDraft((s) => ({ ...s, quantity: Number(e.target.value) }))}
      />
      <button type="button" disabled={updateStock.isPending} onClick={save}>Save</button>
      {updateStock.error ? <p role="alert">{updateStock.error.message}</p> : null}
      <button type="button" onClick={() => openExternal({ url: "https://example.com/help" })}>Help</button>
    </div>
  );
}
```

## State and host hooks
| Hook | Returns |
|---|---|
| `useViewState<T extends Record<string, unknown>>(default)` | `[state, setState]`; persists JSON state across turns and tab switches |
| `useDisplayMode()` | `{ displayMode, availableDisplayModes, requestDisplayMode({ mode }) }`; `DisplayMode = "inline" \| "fullscreen" \| "pip"` (host support differs) |
| `useHostContext()` | `{ theme, locale, timeZone, userAgent, platform: "web" \| "mobile", displayMode, safeArea, maxHeight, maxWidth, hostInfo, hostCapabilities, hostContext, isAvailable }` |
| `useViewTheme()` | the string `"light" \| "dark"` |
| `useDeepLink()` | `{ url: string \| undefined }` (ChatGPT deep link; `host-chatgpt`) |
| `useFiles()` | `{ isSupported, upload(file), getDownloadUrl({ fileId }) }` (host-managed files) |

<!-- fixture: hook-host -->
```tsx
import { useDisplayMode, useHostContext, useViewTheme } from "mcp-use/react";

export default function Header() {
  const theme = useViewTheme(); // "light" | "dark", not { theme }
  const { locale, platform, hostCapabilities } = useHostContext();
  const { displayMode, availableDisplayModes, requestDisplayMode } = useDisplayMode();
  const canFullscreen = availableDisplayModes.includes("fullscreen");
  return (
    <header data-theme={theme}>
      <span>{locale} · {platform} · {displayMode} · {hostCapabilities ? "caps" : "no caps"}</span>
      {canFullscreen ? <button type="button" onClick={() => requestDisplayMode({ mode: "fullscreen" })}>Expand</button> : null}
    </header>
  );
}
```

## Model context: what the next model turn can see
`useModelContext()` manages attachments the user's next message carries to the model. **`attachments` is a readonly array** of `{ key, block }`, and `add`, `remove`, `clearAttachments` return **Promises** of `{ status: "synced" | "superseded" }`. `pending` and `error` report the sync state. A block is text, image (`data` + `mimeType`, or a `src` source), resource link or embedded resource, each with optional `title` and `audience`.

<!-- fixture: hook-model-context -->
```tsx
import { ModelContext, useModelContext } from "mcp-use/react";

export default function Selection({ sku, price }: { sku: string; price: number }) {
  const { attachments, pending, error, add, remove } = useModelContext();
  const attached = attachments.some((a) => a.key === "selected-product");

  const toggle = async () => {
    if (attached) await remove("selected-product");
    else await add("selected-product", { type: "text", text: `Selected SKU ${sku}: $${price}`, title: "Selected product" });
  };

  return (
    <div>
      <button type="button" disabled={pending} onClick={toggle}>{attached ? "Remove from chat" : "Add to chat"}</button>
      {error ? <p role="alert">{error.message}</p> : null}
      <ModelContext content={`The user is looking at SKU ${sku}`} />
    </div>
  );
}
```
`<ModelContext content="…">` is the declarative form: it tells the model what the view currently shows, without a user message.

### Wrong (rejected by the compiler): the Record and object-theme versions
<!-- fixture-bad: model-context-record -->
```tsx
import { useModelContext } from "mcp-use/react";

export default function Bad() {
  const { attachments } = useModelContext();
  const summary = attachments["summary"];
  return <span>{String(summary)}</span>;
}
```
<!-- fixture-bad: view-theme-object -->
```tsx
import { useViewTheme } from "mcp-use/react";

export default function Bad() {
  const { theme } = useViewTheme();
  return <span>{theme}</span>;
}
```

## Components
| Component | Props |
|---|---|
| `ThemeProvider` | `{ children, colorScheme?: boolean }` |
| `ViewControls` | `{ children, debugger?: boolean, viewControls?: boolean \| "pip" \| "fullscreen" }` |
| `Image` | `<img>` props; resolves `/_mcp-use/public/…` paths for the host CSP |
| `ErrorBoundary` | React error boundary |
| `ModelContext` | `{ content: string, children? }` |
| `getPublicBaseUrl()` | base URL for public assets |

Also exported: `bootstrapView`, `disposeView`, `ToolError`, `ToolCancelledError`, `toolResultText(result)`, types `ViewConfig`, `DisplayMode`, `HostContext`, `HostCapabilities`, `ModelContext*`.

Sources: M2.
