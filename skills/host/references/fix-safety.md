# Fix safety

1. **Clean tree.** `mcp-use-scan --fix` refuses files with uncommitted changes (and non-git projects) unless `--force`. Before applying suggest/manual fixes, ask the user to commit or stash, or confirm they accept mixed changes.
2. **Findings first.** The report with all findings is written before any edit.
3. **Auto means mechanical.** Only `fix_mode: auto` rules are applied by the engine (import path, `linkComponent="a"`, `useViewTheme()` destructuring, `attachments` array use, missing `@source`, `supportsViews`). Review the diff.
4. **Judgment fixes are separate edits**, one logical change per finding, each citing its `source`. Annotation values (`destructiveHint`, `openWorldHint`) are decisions about what the tool does: read the handler and ask when unsure; do not guess `false`.
5. **Never weaken a check.** Do not edit `data/guard-rules.tsv`, the checklist, or the probe to make a finding disappear. A finding that is wrong is reported as a bug in the plugin, not suppressed.
6. **Waivers** need a reason recorded in the report (`status: "waived"`), and are only for advisories or deliberate product choices (for example a custom font the brand requires).
7. **Re-run after every pass** and stop when two consecutive passes change nothing.
8. **No destructive side effects:** do not call write tools, deploy, or log in to anything while fixing.
