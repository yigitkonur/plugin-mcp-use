# Display modes, `viewConfig`, state, size

Checked against `dist/react/runtime/view-config.d.ts`, `hooks/use-display-mode.d.ts`, `hooks/use-view-state.d.ts` (2.11.0).

## `viewConfig`
Export it from `view.tsx` to describe how the view wants to be hosted.
<!-- fixture: view-config -->
```tsx
import type { ViewConfig } from "mcp-use/react";

export const viewConfig = {
  autoResize: true, // report content height to the host
  displayModes: ["inline", "fullscreen"], // what the view supports
  preferredDisplayMode: "inline", // "inline" | "fullscreen" (not "pip")
} satisfies ViewConfig;

export default function Card() {
  return <div>card</div>;
}
```
- `DisplayMode` in the types is `"inline" | "fullscreen" | "pip"`, but `preferredDisplayMode` accepts only `inline` or `fullscreen`.
- Observed default: a bound view's resource advertises `openai/ui.availableDisplayModes = ["inline", "fullscreen"]`.
- Whether a host honors a mode is host behavior. ChatGPT's own docs disagree about picture-in-picture (its extensions spec says `inline` and `fullscreen` only; its UI guidelines list PiP). Do not depend on `pip` until the live check in `host-chatgpt` says otherwise.

## Requesting a mode
`useDisplayMode()` returns `{ displayMode, availableDisplayModes, requestDisplayMode({ mode }) }`. Check `availableDisplayModes` before offering a control (`hooks.md`). Inline is the default surface; use fullscreen for tasks that need room (editors, maps, tables), and give a way back.

## View state
`useViewState(default)` persists JSON-serializable UI state across turns and tab switches and returns `[state, setState]`. Keep it small, non-sensitive and serializable; do not store credentials or personal data in it. Server data belongs in tool results, not in view state.

## Size
- `autoResize` defaults to `true` (checked in `react/index.js`: `config?.autoResize ?? true`) and reports content height to the host. Do not assume a fixed frame height.
- `useHostContext()` exposes `maxHeight`, `maxWidth`, `safeArea`, and `platform` ("web" or "mobile") for layout decisions.
- `useSendSizeChanged()` reports an explicit size when content changes outside React's render cycle.

## Theme and locale
Read theme and locale from the host (`useViewTheme()`, `useHostContext().locale`), not from `prefers-color-scheme`. A view that paints no background shows the host's backdrop, which is what hosts want for inline cards.

Sources: M2, O6, O3.
