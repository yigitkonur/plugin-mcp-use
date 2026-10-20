# ChatGPT UI guidelines (condensed)

Source: OpenAI "UI guidelines" (O3), checked 2026-10-20. Rules marked (⚠) are where OpenAI's own pages disagree; the plugin treats them as advisories.

## Display modes
OpenAI's UI guidelines (O3) say every app starts **inline**, before the model's reply, and to use a richer mode only when it improves the workflow. (⚠) The MCP extensions spec (O6) says that when `availableDisplayModes` lists both `inline` and `fullscreen`, ChatGPT defaults to `fullscreen` unless `preferredDisplayMode` says otherwise, and that entrypoints always open fullscreen; mcp-use declares both modes by default and the F14 render opened in a side panel (S7). To ask for an inline card, set `preferredDisplayMode: "inline"` in the view's `viewConfig`: mcp-use then emits `_meta["openai/ui"].preferredDisplayMode` (observed, S26), and the spec says ChatGPT considers it; that ChatGPT honors it was not tested here (`${CLAUDE_PLUGIN_ROOT}/skills/mcp-apps/references/display-and-state.md`).

### Inline card
Use for one action or decision, a small amount of structured data, or a self-contained widget.
- A title when the card is document-based or lists items under a parent.
- **At most two actions**, placed at the bottom: one primary, one optional secondary. Each action performs a conversation turn or a tool call.
- An expand control to open fullscreen when the card holds rich media or interactivity (a map, a diagram). "Show more" to reveal extra list items.
- Inline editing of text is fine; edits persist. Height may grow with content up to the mobile display area.
- **No nested scrolling** (the card auto-fits), **no tabs, drill-ins or deep navigation** (split into separate cards or tool actions), **no duplicate inputs** that replicate ChatGPT's composer.

### Inline carousel
Use for a small list of similar, visual items.
- **3 to 8 items.** Each item has an image or visual, usually a title, optional badge, metadata of the most relevant facts, and at most one CTA.
- (⚠) Metadata limits are stated as "no more than two lines" in one place and "three lines max" in another; keep to two.
- Consistent hierarchy across items.

### Fullscreen
For tasks that do not fit a card: editing canvases, maps, detailed browsing. The ChatGPT composer stays overlaid, so design for conversation with the app. An existing editor or admin interface may be embedded if it meets the iframe policy (`csp-and-iframes.md`).

### Picture-in-picture
A floating window for live sessions (games, collaboration). It must respond to composer input and close when the session ends. (⚠) OpenAI's extensions spec says ChatGPT supports `inline` and `fullscreen` but not `pip`; its UI guidelines and `window.openai` reference still describe PiP. Do not rely on PiP until the live check passes.

## Visual design
- **Color:** system palette for text, icons, dividers. Brand color only on accents, icons, badges and primary buttons. Do not override backgrounds or text colors. Avoid custom gradients or patterns.
- **Type:** inherit the system font stack. No custom fonts, even in fullscreen. Limit size variation; prefer body and small body.
- **Spacing:** system grid, consistent padding, no edge-to-edge text, respect corner radii, clear headline, supporting text, CTA order.
- **Icons and imagery:** system icons or monochrome outlined custom icons. **Do not include your logo in the response**; ChatGPT adds your logo and app name. Respect enforced aspect ratios.
- **Accessibility:** WCAG AA contrast, alt text on every image, layouts that survive text resizing.

## What the plugin checks
`mcp-use-scan --host chatgpt` flags: custom `font-family`/web fonts (CG-U08), nested scroll (CG-U10), more than two buttons in a card (CG-U11), tabs (CG-U12), `<img>` without `alt` (CG-U14), custom gradients (CG-U15), `<iframe>` (CG-U16), `pip` in display modes (CG-R07). Carousel size (CG-U17) and WCAG contrast need a human or a screenshot review.

Sources: O3, O6, O1, S7, S26.
