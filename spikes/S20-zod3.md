# S20 — zod 3 with mcp-use 2.11.0

Question: the old reference said any Standard Schema validator works (Zod, ArkType, Valibot). Does a zod 3 schema work? A migrating SDK v1 server usually has zod 3.

Setup (2026-10-20): copy of a one-tool mcp-use server with `zod@3.25.76` linked in place of zod 4, everything else the fixtures workspace (`mcp-use@2.11.0`).

`npx mcp-use typecheck`:
```
index.ts(5,34): error TS2322: Type 'ZodObject<{ n: ZodNumber; }, "strip", ZodTypeAny, …>' is not assignable to type 'StandardSchemaWithJSON<unknown, unknown>'.
  Property 'jsonSchema' is missing in type 'Props<{ n: number; }, { n: number; }>' but required in type 'Props<unknown, unknown>'.
```
`mcp-use dev` starts and `mcp-use-probe`:
```
z3 1.0.0 via modern protocol 2026-07-28: 0 tools, 0 resources, 0 prompts, 0 ui resources
WARNING  PROBE   server  tools/list: Schema appears to be from zod 3, which the SDK cannot convert to JSON Schema. Upgrade to zod >=4.2.0, or wrap your JSON Schema with fromJsonSchema().
```

Decision: zod 3 is unsupported (typecheck fails; at runtime `tools/list` errors and the server shows no tools). Require zod >= 4.2.0 (the scaffolds pin ^4.4.3). Guard rule STK-13 flags a zod 3 range in a package.json that also depends on mcp-use; the migration playbook makes the zod upgrade a first step. Other Standard Schema libraries were not tested here.
