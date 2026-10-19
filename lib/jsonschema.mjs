// Tiny JSON Schema validator: enough for schemas generated from Zod/Valibot/ArkType tool outputs.
export function validate(schema, value, path = "$") {
  const errs = [];
  const add = (m) => errs.push(`${path}: ${m}`);
  if (schema === true || schema === undefined) return errs;
  if (schema === false) return [`${path}: schema is false`];
  if (schema.anyOf || schema.oneOf) {
    const alts = schema.anyOf || schema.oneOf;
    if (!alts.some((s) => validate(s, value, path).length === 0)) add("matches none of the allowed alternatives");
    return errs;
  }
  if ("const" in schema && JSON.stringify(schema.const) !== JSON.stringify(value)) add(`must equal ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.some((e) => JSON.stringify(e) === JSON.stringify(value))) add(`must be one of ${JSON.stringify(schema.enum)}`);
  const types = schema.type ? [].concat(schema.type) : null;
  const typeOf = (v) => (v === null ? "null" : Array.isArray(v) ? "array" : Number.isInteger(v) ? "integer" : typeof v);
  if (types) {
    const t = typeOf(value);
    const ok = types.some((x) => x === t || (x === "number" && t === "integer"));
    if (!ok) { add(`expected ${types.join("|")}, got ${t}`); return errs; }
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const r of schema.required ?? []) if (!(r in value)) add(`missing required property "${r}"`);
    for (const [k, s] of Object.entries(schema.properties ?? {})) if (k in value) errs.push(...validate(s, value[k], `${path}.${k}`));
    if (schema.additionalProperties === false) for (const k of Object.keys(value)) if (!(k in (schema.properties ?? {}))) add(`unexpected property "${k}"`);
  }
  if (Array.isArray(value) && schema.items) value.forEach((v, i) => errs.push(...validate(schema.items, v, `${path}[${i}]`)));
  if (typeof value === "string") { if (schema.minLength != null && value.length < schema.minLength) add("too short"); if (schema.maxLength != null && value.length > schema.maxLength) add("too long"); }
  if (typeof value === "number") { if (schema.minimum != null && value < schema.minimum) add(`below minimum ${schema.minimum}`); if (schema.maximum != null && value > schema.maximum) add(`above maximum ${schema.maximum}`); }
  return errs;
}
