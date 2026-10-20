// Archestra Owned-App HTML lint. Written from Archestra's documentation (A1/A2) and observed behavior (A3);
// no Archestra code is used. Deliberately lexical (like the platform's own lint): script text is scanned with regexes,
// SDK-member scans strip JS comments, browser-storage scans do not. validate_app on a real Archestra stays authoritative.
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const POLICY_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "archestra-policy.json");
export const loadPolicy = (p = POLICY_PATH) => JSON.parse(readFileSync(p, "utf8"));

const RULES = {
  AA01: ["error", "suggest", "Script text sets up its own host connection (SDK bootstrap marker); Archestra injects window.archestra, so a save is rejected. Remove that script block.", "A2"],
  AA02: ["error", "auto", "Page loads Archestra's SDK script itself; the platform injects it and rejects the save. Remove the tag.", "A2"],
  AA03: ["error", "auto", "Page links Archestra's base stylesheet itself; the platform injects it and rejects the save. Remove the tag.", "A2"],
  AA04: ["error", "manual", "HTML could not be parsed (empty or no markup).", "A3"],
  AA05: ["error", "manual", "HTML is larger than the 512 KB app limit.", "A3"],
  AA06: ["error", "manual", "Unknown uiPermissions key (allowed: camera, microphone, geolocation, clipboardWrite).", "A2"],
  AW01: ["warning", "auto", "No <head> or <html> element; provide a complete HTML document.", "A3"],
  AW02: ["warning", "suggest", "Script or stylesheet loads from a host outside the CDN allowlist (jsdelivr, unpkg, cdnjs, fonts.googleapis, fonts.gstatic); it will be blocked.", "A2"],
  AW03: ["warning", "suggest", "localStorage/sessionStorage/IndexedDB throw without a sandbox domain and are private to one browser; use archestra.storage.user or .shared (async).", "A2"],
  AW04: ["warning", "auto", "archestra.storage has only the partitions user and shared; this call is missing the partition.", "A3"],
  AW05: ["warning", "suggest", "Not a member of window.archestra (ready, user, context, storage, files, llm, tools, ui).", "A3"],
  AD01: ["warning", "suggest", "The app has no network access; external fetch/XHR/WebSocket fails. Get data through an assigned MCP tool with archestra.tools.call.", "A2"],
  AD02: ["warning", "manual", "Apps cannot embed iframes.", "A2"],
  AD03: ["warning", "suggest", "Native form submission is blocked; handle the submit event in script and call preventDefault().", "A2"],
  AD04: ["warning", "suggest", "target=\"_blank\" and window.open do nothing in the sandbox; use archestra.ui.openLink(url).", "A2"],
  AD05: ["warning", "suggest", "Images, audio and video from hosts outside the CDN allowlist do not load; use a tool result's dataUrl.", "A2"],
  AD06: ["advisory", "suggest", "Pass objects to storage set directly; do not JSON.stringify them.", "A2"],
  AD07: ["advisory", "suggest", "A top-level null cannot be stored; call delete(key) to clear a key.", "A2"],
  AD08: ["advisory", "suggest", "SDK members used but `await archestra.ready` never appears; await it before the first call.", "A2"],
  AD09: ["advisory", "manual", "tools.call takes the name exactly as tools.list() returns it (server__tool).", "A2"],
  AD10: ["advisory", "suggest", "CSS overrides the hidden attribute with display; the platform always hides [hidden] and reports this as a render diagnostic.", "A2"],
  AD11: ["advisory", "manual", "Device API used; declare the matching uiPermissions on scaffold_app (camera, microphone, geolocation, clipboardWrite).", "A2"],
  AD12: ["advisory", "suggest", "updateModelContext text over 500 characters is cut off; send one short line.", "A2"],
  AD13: ["advisory", "suggest", "Pin the package version in the CDN URL so a new release cannot change the app's code.", "A2"],
  AD14: ["advisory", "manual", "files.save filename must be a plain name up to 256 characters with no /, \\ or leading dot.", "A2"],
};
export const RULE_IDS = Object.keys(RULES);
export const RULE_META = Object.fromEntries(Object.entries(RULES).map(([id, [severity, fix_mode, message, source]]) => [id, { severity, fix_mode, message, source }]));

const stripJsComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")).replace(/(^|[^:\\"'`])\/\/[^\n]*/g, "$1");
const blank = (m) => m.replace(/[^\n]/g, " ");
const lineAt = (text, idx) => text.slice(0, idx).split("\n").length;

function levenshtein(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

function hostOf(url) {
  const u = url.trim();
  if (/^(?:https?:)?\/\//i.test(u)) {
    try { return new URL(u.startsWith("//") ? "https:" + u : u); } catch { return null; }
  }
  return null; // relative, data:, blob:, javascript:, and anything else is not a network host
}

// Attribute values for a tag name, tolerating solidus-fused forms (<script/src=...>) and unquoted values.
function tagRefs(text, tag, attr) {
  const out = [];
  const re = new RegExp(`<${tag}(?=[\\s/>])([^>]*)>`, "gi");
  let m;
  while ((m = re.exec(text))) {
    const a = new RegExp(`[\\s/]${attr}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(m[1]);
    if (a) out.push({ value: a[1] ?? a[2] ?? a[3], index: m.index, tag: m[0] });
  }
  return out;
}

function scriptBlocks(text) {
  const out = [];
  const re = /<script(?=[\s/>])([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  let m;
  while ((m = re.exec(text))) out.push({ open: m[1], body: m[2], bodyIndex: m.index + m[0].indexOf(m[2], 7), index: m.index, full: m[0] });
  return out;
}

export function lintHtml(rawText, { policy = loadPolicy(), uiPermissions = null, file = "app.html" } = {}) {
  const findings = [];
  const add = (id, line, evidence, extra = {}) => {
    const [severity, fix_mode, message, source] = RULES[id];
    findings.push({ rule_id: id, severity, host: "archestra-owned", method: "static", file, line, evidence: String(evidence).trim().slice(0, 140), message: extra.message ?? message, fix_mode, source, ...extra.rest });
  };
  const text = rawText;
  const bytes = Buffer.byteLength(text, "utf8");
  if (bytes > policy.limits.html_bytes) add("AA05", 1, `${bytes} bytes (limit ${policy.limits.html_bytes})`);
  if (!text.trim() || !/<[a-zA-Z!]/.test(text)) { add("AA04", 1, "no markup found"); return sorted(findings); }

  // HTML comments are not scanned for resource references (matches the platform); scripts are scanned lexically.
  const noComments = text.replace(/<!--[\s\S]*?-->/g, blank);
  const scripts = scriptBlocks(noComments);
  const scriptText = scripts.map((s) => s.body).join("\n");

  // AA01 bootstrap markers inside script text
  for (const s of scripts) for (const mk of policy.bootstrap_markers) {
    const i = s.body.indexOf(mk);
    if (i >= 0) add("AA01", lineAt(text, s.bodyIndex + i), mk, { rest: { marker: mk } });
  }
  // AA02 / AA03 platform self-loads (those tags are skipped by AW02/AD13 below: the save is rejected anyway)
  const platformTags = new Set();
  for (const r of tagRefs(noComments, "script", "src")) if (policy.platform_script_markers.some((mk) => r.value.includes(mk))) { platformTags.add(r.index); add("AA02", lineAt(text, r.index), r.value, { rest: { tag: r.tag } }); }
  for (const r of tagRefs(noComments, "link", "href")) if (r.value.includes(policy.platform_css_marker)) { platformTags.add(r.index); add("AA03", lineAt(text, r.index), r.value, { rest: { tag: r.tag } }); }
  // AA06 declared uiPermissions
  if (uiPermissions) for (const k of uiPermissions) if (!policy.permissions_allowed.includes(k)) add("AA06", 1, k, { message: `Unknown uiPermissions key "${k}" (allowed: ${policy.permissions_allowed.join(", ")}).` });

  // AW01 document root
  if (!/<(?:head|html)(?=[\s/>])/i.test(noComments)) add("AW01", 1, "(no <head> or <html>)");

  // AW02 / AD13: hosts of script src and link href (stylesheets); AD05: media and CSS url()
  const allow = new Set(policy.cdn_allowlist);
  const refs = [...tagRefs(noComments, "script", "src"), ...tagRefs(noComments, "link", "href")];
  for (const r of refs) {
    if (platformTags.has(r.index)) continue;
    const u = hostOf(r.value);
    if (!u) continue;
    const host = u.hostname.toLowerCase();
    if (!allow.has(host)) add("AW02", lineAt(text, r.index), r.value, { message: `Host ${host} is outside the CDN allowlist; it will be blocked.` });
    else if (!/fonts\.(googleapis|gstatic)\.com$/.test(host)) {
      const pinned = host === "cdnjs.cloudflare.com" ? /\/\d+\.\d+/.test(u.pathname) : /@\d/.test(u.pathname);
      if (!pinned) add("AD13", lineAt(text, r.index), r.value);
    }
  }
  const mediaTags = ["img", "audio", "video", "source", "image"];
  for (const t of mediaTags) for (const r of tagRefs(noComments, t, "src")) {
    const u = hostOf(r.value);
    if (u && !allow.has(u.hostname.toLowerCase())) add("AD05", lineAt(text, r.index), r.value);
  }
  for (const m of noComments.matchAll(/url\(\s*["']?((?:https?:)?\/\/[^"')\s]+)["']?\s*\)/gi)) {
    const u = hostOf(m[1]);
    if (u && !allow.has(u.hostname.toLowerCase())) add("AD05", lineAt(text, m.index), m[1]);
  }

  // Script-text rules. SDK-member scans strip comments; storage and the rest scan raw script text.
  const codeStripped = scripts.map((s) => ({ ...s, code: stripJsComments(s.body) }));
  for (const s of scripts) {
    for (const m of s.body.matchAll(/\b(localStorage|sessionStorage|indexedDB)\b/g)) add("AW03", lineAt(text, s.bodyIndex + m.index), m[0], { rest: { api: m[1] } });
  }
  const members = new Set(policy.sdk_surface.top_level);
  const parts = new Set(policy.sdk_surface.storage_partitions);
  for (const s of codeStripped) {
    for (const m of s.code.matchAll(/\barchestra\.storage\.([A-Za-z_$][0-9A-Za-z_$]*)/g)) {
      if (!parts.has(m[1])) add("AW04", lineAt(text, s.bodyIndex + m.index), m[0], { rest: { member: m[1] } });
    }
    for (const m of s.code.matchAll(/\barchestra\.([A-Za-z_$][0-9A-Za-z_$]*)/g)) {
      if (!members.has(m[1])) {
        const near = [...members].map((x) => [x, levenshtein(x, m[1])]).sort((a, b) => a[1] - b[1])[0];
        add("AW05", lineAt(text, s.bodyIndex + m.index), m[0], { rest: { member: m[1], nearest: near[1] <= 2 ? near[0] : null } });
      }
    }
  }
  const code = codeStripped.map((s) => s.code).join("\n");
  const firstScriptLine = (re) => { for (const s of codeStripped) { const m = re.exec(s.code); if (m) return lineAt(text, s.bodyIndex + m.index); } return 1; };

  // AD01 network from script
  for (const s of codeStripped) {
    for (const m of s.code.matchAll(/\bfetch\s*\(\s*["'`]((?:https?:)?\/\/[^"'`]+)["'`]|\bnew\s+(?:WebSocket|EventSource)\s*\(|\bXMLHttpRequest\b/g)) add("AD01", lineAt(text, s.bodyIndex + m.index), m[0]);
  }
  // AD02 iframe, AD03 form, AD04 target/window.open
  for (const m of noComments.matchAll(/<iframe(?=[\s/>])/gi)) add("AD02", lineAt(text, m.index), m[0]);
  const forms = [...noComments.matchAll(/<form(?=[\s/>])/gi)];
  if (forms.length && !/preventDefault\s*\(/.test(code)) for (const m of forms) add("AD03", lineAt(text, m.index), m[0]);
  for (const m of noComments.matchAll(/\btarget\s*=\s*["']?_blank/gi)) add("AD04", lineAt(text, m.index), m[0]);
  for (const s of codeStripped) for (const m of s.code.matchAll(/\bwindow\.open\s*\(/g)) add("AD04", lineAt(text, s.bodyIndex + m.index), m[0]);
  // AD06 / AD07 storage values
  for (const s of codeStripped) {
    for (const m of s.code.matchAll(/\.set\s*\(\s*[^,()]+,\s*JSON\.stringify\s*\(/g)) add("AD06", lineAt(text, s.bodyIndex + m.index), m[0]);
    for (const m of s.code.matchAll(/\.set\s*\(\s*[^,()]+,\s*null\s*[,)]/g)) add("AD07", lineAt(text, s.bodyIndex + m.index), m[0]);
  }
  // AD08 ready
  if (/\barchestra\.(?:user|context|storage|files|llm|tools|ui)\b/.test(code) && !/\barchestra\.ready\b/.test(code)) add("AD08", firstScriptLine(/\barchestra\.(?:user|context|storage|files|llm|tools|ui)\b/), "archestra.* used, no `await archestra.ready`");
  // AD09 tools.call name shape
  for (const s of codeStripped) for (const m of s.code.matchAll(/\btools\.call\s*\(\s*["'`]([^"'`]+)["'`]/g)) {
    if (!m[1].includes("__") && !policy.builtin_file_tools.includes(m[1])) add("AD09", lineAt(text, s.bodyIndex + m.index), m[0], { message: `tools.call("${m[1]}"): pass the name exactly as tools.list() returns it (server__tool, e.g. github__list_issues).` });
  }
  // AD10 CSS that sets display on something carrying `hidden`: a [hidden] selector with display other than none,
  // or a .class/#id selector whose element in this file has the hidden attribute.
  const hiddenClasses = new Set(), hiddenIds = new Set();
  for (const t of noComments.matchAll(/<[a-zA-Z][\w-]*((?:\s+[^\s>=/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*\/?>/g)) {
    const attrs = t[1];
    if (!/(?:^|\s)hidden(?=[\s=]|$)/i.test(attrs)) continue;
    for (const c of /\bclass\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs)?.slice(1).filter(Boolean).join(" ").split(/\s+/) ?? []) if (c) hiddenClasses.add(c);
    const id = /\bid\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs); if (id) hiddenIds.add(id[1] ?? id[2]);
  }
  for (const st of noComments.matchAll(/<style(?=[\s/>])[^>]*>([\s\S]*?)<\/style\s*>/gi)) {
    const css = st[1].replace(/\/\*[\s\S]*?\*\//g, blank), base = st.index + st[0].indexOf(st[1]);
    for (const rule of css.matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
      const disp = /(?:^|;|\s)display\s*:\s*([^;}!]+)/i.exec(rule[2]);
      if (!disp || /^none\s*$/i.test(disp[1].trim())) continue;
      for (const sel of rule[1].split(",")) {
        const last = sel.trim().split(/[\s>+~]+/).pop() ?? "";
        const hits = /\[hidden\]/i.test(last) || [...last.matchAll(/\.([\w-]+)/g)].some((c) => hiddenClasses.has(c[1])) || [...last.matchAll(/#([\w-]+)/g)].some((c) => hiddenIds.has(c[1]));
        if (hits) add("AD10", lineAt(text, base + rule.index), `${sel.trim()} { display: ${disp[1].trim()} }`);
      }
    }
  }
  // AD11 device APIs
  for (const s of codeStripped) for (const m of s.code.matchAll(/\bnavigator\.(?:mediaDevices|geolocation)\b|\bgetUserMedia\s*\(|\bnavigator\.clipboard\.writeText\b/g)) add("AD11", lineAt(text, s.bodyIndex + m.index), m[0]);
  // AD12 updateModelContext literal length
  for (const s of codeStripped) for (const m of s.code.matchAll(/\bupdateModelContext\s*\(\s*(["'`])((?:\\.|(?!\1)[\s\S])*)\1/g)) {
    if (m[2].length > policy.limits.model_context_visible_chars) add("AD12", lineAt(text, s.bodyIndex + m.index), `${m[2].length} characters`);
  }
  // AD14 files.save literal filename
  for (const s of codeStripped) for (const m of s.code.matchAll(/\bfiles\.save\s*\(\s*(["'`])((?:\\.|(?!\1).)*)\1/g)) {
    const n = m[2];
    if (/[\\/]/.test(n) || n.startsWith(".") || n.length > policy.limits.filename_length || n === "") add("AD14", lineAt(text, s.bodyIndex + m.index), n);
  }
  void scriptText;
  return sorted(findings);
}

const RANK = { error: 0, warning: 1, advisory: 2 };
function sorted(fs) {
  const seen = new Set();
  return fs.filter((f) => { const k = `${f.rule_id}\t${f.line}\t${f.evidence}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => RANK[a.severity] - RANK[b.severity] || a.line - b.line || a.rule_id.localeCompare(b.rule_id));
}

// ---- fixes: only fix_mode=auto rules; idempotent -----------------------------------------------
export function applyAutoFixes(text, findings) {
  let out = text;
  const notes = [];
  const ids = new Set(findings.filter((f) => f.fix_mode === "auto").map((f) => f.rule_id));
  if (ids.has("AA02")) {
    const before = out;
    out = out.replace(/<script(?=[\s/>])[^>]*[\s/]src\s*=\s*(?:"[^"]*(?:archestra-app-sdk|ext-apps-app)[^"]*"|'[^']*(?:archestra-app-sdk|ext-apps-app)[^']*'|[^\s>]*(?:archestra-app-sdk|ext-apps-app)[^\s>]*)[^>]*>\s*<\/script\s*>\n?/gi, "");
    if (out !== before) notes.push("AA02: removed the platform SDK <script> tag");
  }
  if (ids.has("AA03")) {
    const before = out;
    out = out.replace(/<link(?=[\s/>])[^>]*[\s/]href\s*=\s*(?:"[^"]*archestra-app-base[^"]*"|'[^']*archestra-app-base[^']*'|[^\s>]*archestra-app-base[^\s>]*)[^>]*>\n?/gi, "");
    if (out !== before) notes.push("AA03: removed the platform base stylesheet <link> tag");
  }
  if (ids.has("AW04")) {
    const before = out;
    out = out.replace(/\barchestra\.storage\.(get|set|list|delete)\s*\(/g, "archestra.storage.user.$1(");
    if (out !== before) notes.push("AW04: archestra.storage.<method>( -> archestra.storage.user.<method>( (assumed the private partition; use .shared if every viewer should share the data)");
  }
  if (ids.has("AW01") && !/<(?:head|html)(?=[\s/>])/i.test(out)) {
    out = `<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n<title>App</title>\n</head>\n<body>\n${out.trim()}\n</body>\n</html>\n`;
    notes.push("AW01: wrapped the fragment in a document skeleton");
  }
  return { text: out, notes };
}
