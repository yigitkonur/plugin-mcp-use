# Should this tool have a UI?

OpenAI's guidance: "Custom UI is optional"; use cards, carousels and fullscreen "only when visual interaction improves the workflow" (O1, O3). Start from the user's task, not from the tool list.

**A UI earns its place when** the user needs to:
- inspect structured data at a glance (an order, a booking, a status);
- compare several options side by side (a short list of similar items);
- edit or confirm something with direct manipulation (a form, a seat map, an approval);
- navigate or explore visual content (a map, a diagram, a document viewer).

**Stay tools-only when** the answer is a sentence or a number the model can say, the output is a long text, the tool is a background action, or the data is only useful to the model.

**Choose the shape**
- *Inline card* for one decision or a small piece of data, at most two actions, no tabs, no nested scroll (`host-chatgpt/references/ui-guidelines.md`).
- *Carousel* for 3 to 8 similar visual items.
- *Fullscreen* for an editor, map or multi-step flow; the composer stays available.
- *Split data and render tools* when the model or other hosts need the data without a card, or when UI interactions must call data tools without remounting: the data tool returns `structuredContent` only; the render tool owns `view`. Keep every tool useful without the UI.
- Helper actions the view calls (save, refresh) are viewless tools; give them `visibility: "app"` if the model should not call them.

**Cost of a view**: a React component, a CSS/Tailwind decision, a CSP to maintain, host-specific rules, and a cache-key caveat on ChatGPT (`mcp-apps/references/views.md`). If the table of benefits is empty for a tool, leave it alone.

Sources: O1, O3.
