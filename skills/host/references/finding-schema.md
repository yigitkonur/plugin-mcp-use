# Finding schema

Every engine and the reviewer agent report findings in this shape (`mcp-use-scan --json`, `mcp-use-probe --json`, `host-reviewer`):

```json
{
  "rule_id": "CG-T01",
  "severity": "error | warning | advisory",
  "host": "stack | chatgpt | archestra | archestra-owned",
  "method": "static | probe | manual",
  "file": "index.ts",
  "line": 12,
  "target": "tool:show-product",
  "evidence": "the matching line, or what the probe saw",
  "message": "one sentence: what is wrong and what to do",
  "fix_mode": "auto | suggest | manual",
  "patch": "optional unified diff or replacement text",
  "source": "a data/sources.json id",
  "status": "open | fixed | waived",
  "waiver": "reason, only when status is waived"
}
```
`file` and `line` come from static findings; `target` from probe findings; manual findings carry whichever applies. The report file is `{ "host", "date", "counts": {error, warning, advisory}, "findings": [...], "unverified": ["item and reason"] }`.
