// Tiny JSON Schema validator: enough for schemas generated from Zod/Valibot/ArkType tool outputs.
// Implemented: type, enum, const, anyOf, oneOf (exactly one), allOf, if/then, required, properties, additionalProperties:false, items,
// minLength/maxLength/pattern, minimum/maximum/exclusiveMinimum/exclusiveMaximum, minItems/maxItems. Unknown keywords are ignored.
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
export function validate(schema, value, path = "$") {
  const errs = [];
  const add = (m) => errs.push(`${path}: ${m}`);
  if (schema === true || schema === undefined) return errs;
  if (schema === false) return [`${path}: schema is false`];
  if (schema.anyOf && !schema.anyOf.some((s) => validate(s, value, path).length === 0)) add("matches none of the allowed alternatives");
  if (schema.oneOf) {
    const n = schema.oneOf.filter((s) => validate(s, value, path).length === 0).length;
    if (n !== 1) add(n === 0 ? "matches none of the allowed alternatives" : `matches ${n} alternatives, exactly one is allowed`);
  }
  for (const s of schema.allOf ?? []) errs.push(...validate(s, value, path));
  if (schema.if && schema.then && validate(schema.if, value, path).length === 0) errs.push(...validate(schema.then, value, path));
  if ("const" in schema && JSON.stringify(schema.const) !== JSON.stringify(value)) add(`must equal ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.some((e) => JSON.stringify(e) === JSON.stringify(value))) add(`must be one of ${JSON.stringify(schema.enum)}`);
  const types = schema.type ? [].concat(schema.type) : null;
  const typeOf = (v) => (v === null ? "null" : Array.isArray(v) ? "array" : Number.isInteger(v) ? "integer" : typeof v);
  if (types) {
    const t = typeOf(value);
    if (!types.some((x) => x === t || (x === "number" && t === "integer"))) { add(`expected ${types.join("|")}, got ${t}`); return errs; }
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const r of schema.required ?? []) if (!has(value, r)) add(`missing required property "${r}"`);
    for (const [k, s] of Object.entries(schema.properties ?? {})) if (has(value, k)) errs.push(...validate(s, value[k], `${path}.${k}`));
    if (schema.additionalProperties === false) for (const k of Object.keys(value)) if (!has(schema.properties ?? {}, k)) add(`unexpected property "${k}"`);
  }
  if (Array.isArray(value)) {
    if (schema.items) value.forEach((v, i) => errs.push(...validate(schema.items, v, `${path}[${i}]`)));
    if (schema.minItems != null && value.length < schema.minItems) add(`fewer than ${schema.minItems} items`);
    if (schema.maxItems != null && value.length > schema.maxItems) add(`more than ${schema.maxItems} items`);
  }
  if (typeof value === "string") {
    if (schema.minLength != null && value.length < schema.minLength) add("too short");
    if (schema.maxLength != null && value.length > schema.maxLength) add("too long");
    if (schema.pattern) { try { if (!new RegExp(schema.pattern, "u").test(value)) add(`does not match pattern ${schema.pattern}`); } catch { /* unsupported pattern syntax: not checked */ } }
  }
  if (typeof value === "number") {
    if (schema.minimum != null && value < schema.minimum) add(`below minimum ${schema.minimum}`);
    if (schema.maximum != null && value > schema.maximum) add(`above maximum ${schema.maximum}`);
    if (typeof schema.exclusiveMinimum === "number" && value <= schema.exclusiveMinimum) add(`not above ${schema.exclusiveMinimum}`);
    if (typeof schema.exclusiveMaximum === "number" && value >= schema.exclusiveMaximum) add(`not below ${schema.exclusiveMaximum}`);
  }
  return errs;
}
