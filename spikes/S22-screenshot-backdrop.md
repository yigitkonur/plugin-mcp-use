# S22 — what `mcp-use screenshot` paints behind a view

Question: a migrated view showed black text on a black card in `--theme light` but was fine in `--theme dark`. Is that the view's fault or the harness's?

Setup (2026-10-20): `@mcp-use/cli@4.5.0`, a one-tool server whose view is `<div style={{ padding: 16 }}>{msg}</div>` with no colors (`/tmp/fx-bg`).
`npx mcp-use screenshot --mcp http://localhost:3644/mcp --tool plain --theme light --delay 1500` and again with `--theme dark`.

Observed: both PNGs (768x55) are entirely black. The backdrop behind the iframe is black in both themes, and the unstyled text is black, so it is invisible in both. The migrated ticket view showed up in dark only because its `.dark` rule painted `#111` and `#eee`.

Decision:
- Screenshot evidence is only meaningful for views that paint their own foreground and background per theme (or use the Apps SDK UI tokens). Guidance now says so (`mcp-apps/references/display-and-state.md`, `verify/references/ladder.md` rung 4) and `migrate` requires opening both PNGs.
- Whether real hosts draw a light backdrop for an unstyled card in light mode is not established here; do not rely on it.
