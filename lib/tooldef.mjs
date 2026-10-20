// Lexical helpers for server.tool({...}, cb) definitions. No TypeScript parser: a small scanner that knows
// strings, template literals, and comments, so braces inside them do not confuse matching.

export function skipTrivia(text, i) {
  for (;;) {
    while (i < text.length && /\s/.test(text[i])) i++;
    if (text[i] === "/" && text[i + 1] === "/") { while (i < text.length && text[i] !== "\n") i++; continue; }
    if (text[i] === "/" && text[i + 1] === "*") { const j = text.indexOf("*/", i + 2); i = j < 0 ? text.length : j + 2; continue; }
    return i;
  }
}

// Return the index just past the string/template starting at i.
function skipString(text, i) {
  const q = text[i];
  i++;
  while (i < text.length) {
    if (text[i] === "\\") { i += 2; continue; }
    if (text[i] === q) return i + 1;
    if (q === "`" && text[i] === "$" && text[i + 1] === "{") { i = matchClose(text, i + 1, "{", "}") + 1; continue; }
    i++;
  }
  return i;
}

// text[open] is `open`; return the index of the matching `close` (or text.length - 1).
export function matchClose(text, start, open, close) {
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (c === '"' || c === "'" || c === "`") { i = skipString(text, i) - 1; continue; }
    if (c === "/" && text[i + 1] === "/") { while (i < text.length && text[i] !== "\n") i++; continue; }
    if (c === "/" && text[i + 1] === "*") { const j = text.indexOf("*/", i + 2); i = j < 0 ? text.length : j + 1; continue; }
    if (c === open) depth++;
    else if (c === close) { depth--; if (depth === 0) return i; }
  }
  return text.length - 1;
}

// Top-level properties of an object literal source "{ ... }": Map key -> value source (or null for shorthand), plus spread flag.
export function topLevelProps(obj) {
  const props = new Map();
  let spread = false;
  let i = 1;
  const end = obj.length - 1;
  while (i < end) {
    i = skipTrivia(obj, i);
    if (i >= end) break;
    if (obj.startsWith("...", i)) { spread = true; i = endOfValue(obj, i, end); i++; continue; }
    let key;
    if (obj[i] === '"' || obj[i] === "'") { const j = skipString(obj, i); key = obj.slice(i + 1, j - 1); i = j; }
    else { const m = /^[A-Za-z_$][\w$]*/.exec(obj.slice(i)); if (!m) { i = endOfValue(obj, i, end) + 1; continue; } key = m[0]; i += key.length; }
    i = skipTrivia(obj, i);
    if (obj[i] === ":") {
      i = skipTrivia(obj, i + 1);
      const j = endOfValue(obj, i, end);
      props.set(key, obj.slice(i, j).trim());
      i = j + 1;
    } else { props.set(key, null); i = endOfValue(obj, i, end) + 1; }
  }
  return { props, spread };
}

// Index of the comma (depth 0) or end that terminates the value starting at i.
function endOfValue(text, i, end) {
  for (; i < end; i++) {
    const c = text[i];
    if (c === '"' || c === "'" || c === "`") { i = skipString(text, i) - 1; continue; }
    if (c === "/" && text[i + 1] === "/") { while (i < end && text[i] !== "\n") i++; continue; }
    if (c === "/" && text[i + 1] === "*") { const j = text.indexOf("*/", i + 2); i = j < 0 ? end : j + 1; continue; }
    if (c === "{") { i = matchClose(text, i, "{", "}"); continue; }
    if (c === "(") { i = matchClose(text, i, "(", ")"); continue; }
    if (c === "[") { i = matchClose(text, i, "[", "]"); continue; }
    if (c === ",") return i;
  }
  return end;
}

// Find `server.tool(` (and `<ident>.tool(` when the receiver is an MCPServer variable name) definitions.
export function findToolDefs(text, receivers = ["server"]) {
  const out = [];
  const re = new RegExp(`\\b(?:${receivers.join("|")})\\s*\\.\\s*tool\\s*\\(`, "g");
  let m;
  while ((m = re.exec(text))) {
    const open = m.index + m[0].length - 1; // the "("
    const callEnd = matchClose(text, open, "(", ")");
    const objStart = skipTrivia(text, open + 1);
    if (text[objStart] !== "{") continue; // definition not an inline object literal
    const objEnd = matchClose(text, objStart, "{", "}");
    const def = text.slice(objStart, objEnd + 1);
    const { props, spread } = topLevelProps(def);
    out.push({ index: m.index, line: text.slice(0, m.index).split("\n").length, def, props, spread, call: text.slice(m.index, callEnd + 1), name: (props.get("name") ?? "").replace(/^["'`]|["'`]$/g, "") });
  }
  return out;
}

// Look up a dotted path like "annotations.readOnlyHint" in a tool def.
// Returns "present", "absent", or "unknown" (value is not an inline literal, a spread is present, or a reference).
export function pathState(tool, path) {
  const parts = path.split(".");
  let { props, spread } = tool;
  for (let i = 0; i < parts.length; i++) {
    if (!props.has(parts[i])) return spread ? "unknown" : "absent";
    if (i === parts.length - 1) return "present";
    const v = props.get(parts[i]);
    if (v === null || !v.startsWith("{")) return "unknown";
    ({ props, spread } = topLevelProps(v));
  }
  return "present";
}

// Raw source text of the value at a dotted path when it is written inline; undefined when the key is absent,
// is a shorthand property, or sits inside something that is not an inline object literal.
export function pathValue(tool, path) {
  const parts = path.split(".");
  let { props } = tool;
  for (let i = 0; i < parts.length; i++) {
    if (!props.has(parts[i])) return undefined;
    const v = props.get(parts[i]);
    if (i === parts.length - 1) return v === null ? undefined : v;
    if (v === null || !v.startsWith("{")) return undefined;
    ({ props } = topLevelProps(v));
  }
  return undefined;
}
