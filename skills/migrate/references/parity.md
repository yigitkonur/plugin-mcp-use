# Reading the parity diff

`mcp-use-probe --diff before.json after.json` compares two snapshots: tools (title, description, annotations, input/output schema, security schemes, `_meta`), resources, templates, prompts, UI resources, and the sample calls (error flag, `structuredContent`, `content`). It exits 1 when anything differs. Snapshots are taken with `mcp-use-probe --snapshot`, from a stdio command (`--stdio`) or a URL; transport details are not compared.

The diff already ignores JSON key order and a top-level `$schema` (the official SDK writes draft-07, mcp-use 2020-12); it prints a `note:` for that. Everything else it shows is a real difference to classify.

| Line | Class | Action |
|---|---|---|
| `CHANGED tool X: annotations` where `after` adds `destructiveHint`/`openWorldHint` | **intended** | list in the report; confirm each value from the handler |
| `CHANGED tool X: description` / `title` | intended only if you changed it on purpose | otherwise restore the text |
| `CHANGED tool X: inputSchema` where the only differences are listed under "Serializer-only differences" below | **benign**, still list it | note it in the report |
| `CHANGED tool X: inputSchema` (a field missing, a type or `required` change, a lost `default` or `describe`) | **regression** | fix the schema; clients send arguments against it |
| `CHANGED tool X: outputSchema` | regression unless you added/tightened it deliberately | explain in the report |
| `REMOVED tool/resource/prompt` | **regression** | restore it |
| `ADDED tool/resource/prompt` | intended only for a deliberate addition (for example a data tool split out) | state the reason |
| `CHANGED call X` (`structuredContent`, `isError`, `content`) | **regression** | the handler behaves differently; compare line by line |
| `CHANGED tool X: _meta` | intended when mcp-use adds `ui.visibility` or `ui.resourceUri`; check widget keys | otherwise investigate |
| `CHANGED ui …` | expected when widgets are ported | verify with a screenshot |

## Serializer-only differences (zod 3 on SDK v1, zod 4 on mcp-use)
Observed on the inventory fixture (S21). The meaning of the schema is unchanged; confirm that nothing else changed in the same schema before calling it benign.
- `additionalProperties: false` disappears from input objects (SDK v1 with zod 3 wrote it; zod 4 does not).
- Integer fields (`z.number().int()`) gain `minimum: -9007199254740991` and `maximum: 9007199254740991` (the JS safe-integer range).
- Key order and the `$schema` dialect (handled by the diff itself).

## Things the diff cannot see
Handler side effects, performance, auth behavior, behavior on inputs not in the sample calls, log output, and anything a write tool does. Cover them by reading the ported handler beside the old one, by running the project's own tests, and by calling write tools only with the user's go-ahead against a safe target.

## A clean result looks like
`before` and `after` differ only in annotations that mcp-use now sets explicitly, the serializer-only schema differences above, and the dialect note, and every sample call is identical. That was the outcome for the inventory fixture (3 tools, 1 resource, 1 prompt, 2 calls): see `spikes/S21-migration.md`.

Sources: M2, S12, S20, S21.
