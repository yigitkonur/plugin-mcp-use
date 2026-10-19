import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync, execFileSync } from "node:child_process";
import { readFileSync, mkdtempSync, cpSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const scan = join(root, "bin", "mcp-use-scan");
const fx = (n) => join(root, "tests", "fixtures", n);

function runScan(dir, args = []) {
  const r = spawnSync("node", [scan, "--json", ...args], { cwd: dir, encoding: "utf8", env: { ...process.env, CLAUDE_PROJECT_DIR: dir } });
  return { status: r.status, out: r.stdout ? JSON.parse(r.stdout) : null, stderr: r.stderr };
}
const seeded = readFileSync(join(fx("f15"), "SEEDED.tsv"), "utf8").split("\n").filter((l) => l && !l.startsWith("#")).map((l) => l.split("\t"));

test("F14 (clean ChatGPT app): no errors or warnings", () => {
  const { out } = runScan(fx("f14"), ["--host", "chatgpt"]);
  const bad = out.result.findings.filter((f) => f.severity !== "advisory");
  assert.deepEqual(bad, []);
});

test("F13 (tools-only, stack rules only): clean", () => {
  const { status, out } = runScan(fx("f13"));
  assert.equal(status, 0);
  assert.deepEqual(out.result.findings, []);
});

test("F15 seeded defects: recall 100% and no unexpected error/warning", () => {
  const { out } = runScan(fx("f15"), ["--host", "chatgpt"]);
  const found = new Set(out.result.findings.map((f) => `${f.rule_id}\t${f.file}`));
  const missing = seeded.filter(([id, file]) => !found.has(`${id}\t${file}`)).map((x) => x.slice(0, 2).join(" "));
  assert.deepEqual(missing, [], `missed: ${missing.join(", ")}`);
  const expected = new Set(seeded.map(([id, file]) => `${id}\t${file}`));
  const unexpected = out.result.findings.filter((f) => f.severity !== "advisory" && !expected.has(`${f.rule_id}\t${f.file}`));
  assert.deepEqual(unexpected.map((f) => `${f.rule_id} ${f.file}:${f.line}`), []);
  for (const [id, file, severity, fix] of seeded) {
    const f = out.result.findings.find((x) => x.rule_id === id && x.file === file);
    assert.equal(f.severity, severity, `${id} severity`);
    assert.equal(f.fix_mode, fix, `${id} fix_mode`);
  }
});

test("exit codes: errors -> 2, warnings only -> 1", () => {
  assert.equal(runScan(fx("f15"), ["--host", "chatgpt"]).status, 2);
  assert.equal(runScan(fx("f14"), ["--host", "chatgpt"]).status, 1); // advisory CG-R03 only
});

function snippetProject(files) {
  const d = mkdtempSync(join(tmpdir(), "scan-"));
  writeFileSync(join(d, "package.json"), JSON.stringify({ name: "t", type: "module", dependencies: { "mcp-use": "^2.11.0", "@openai/apps-sdk-ui": "0.2.2" } }));
  for (const [p, text] of Object.entries(files)) { mkdirSync(dirname(join(d, p)), { recursive: true }); writeFileSync(join(d, p), text); }
  return d;
}
const ids = (d, host = "chatgpt") => runScan(d, ["--host", host]).out.result.findings.map((f) => f.rule_id);

test("negatives: correct code is not flagged", () => {
  const d = snippetProject({
    "index.ts": `import { MCPServer } from "mcp-use";
const server = new MCPServer({ name: "a", version: "1" });
export const ok = server.tool({ name: "ok", annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false }, outputSchema: z.object({}), view: { name: "v", domain: "https://x.example" } }, async () => ({ content: [], structuredContent: {} }));
const A = { readOnlyHint: true };
export const spread = server.tool({ name: "s", annotations: { ...A } }, async () => ({ content: [] }));
export const ref = server.tool({ name: "r", annotations: A }, async () => ({ content: [] }));
export default server;
`,
    "views/v/view.tsx": `import { useViewTheme, useModelContext } from "mcp-use/react";
import { AppsSDKUIProvider } from "@openai/apps-sdk-ui/components/AppsSDKUIProvider";
export default function V() {
  const theme = useViewTheme();
  const { attachments } = useModelContext();
  const names = attachments.map(({ key }) => key);
  const open = window.openai?.callTool;
  // localStorage in a comment is fine
  return <AppsSDKUIProvider linkComponent="a"><img src="/a.png" alt="a" /><b>{theme}{names.length}{String(open)}</b></AppsSDKUIProvider>;
}
`,
    "vite.config.ts": `import { defineConfig } from "vite";\nexport default defineConfig({ optimizeDeps: { exclude: ["@openai/apps-sdk-ui"] } });\n`,
    "views/v/view.css": `@import "tailwindcss";\n@import "@openai/apps-sdk-ui/css";\n@source "../../node_modules/@openai/apps-sdk-ui";\n`,
  });
  assert.deepEqual(ids(d), []);
});

test("positives: spread/ref annotations are unknown, missing key is caught", () => {
  const d = snippetProject({ "index.ts": `import { MCPServer } from "mcp-use";\nconst server = new MCPServer({ name: "a", version: "1" });\nexport const t = server.tool({ name: "t", annotations: { readOnlyHint: true, openWorldHint: false } }, async () => ({ content: [] }));\nexport default server;\n` });
  const r = runScan(d, ["--host", "chatgpt"]).out.result.findings.find((f) => f.rule_id === "CG-T01");
  assert.deepEqual(r.missing, ["annotations.destructiveHint"]);
});

test("--fix: applies auto rules only, idempotent, report written first", () => {
  const d = mkdtempSync(join(tmpdir(), "fix-"));
  cpSync(fx("f15"), d, { recursive: true });
  const git = (...a) => execFileSync("git", ["-C", d, "-c", "user.name=t", "-c", "user.email=t@t", ...a], { encoding: "utf8" });
  git("init", "-q"); git("add", "-A"); git("commit", "-q", "-m", "seed");
  const first = runScan(d, ["--host", "chatgpt", "--fix"]);
  assert.ok(first.out.result.report.startsWith(".mcp-use-plugin/reports/scan-"));
  assert.deepEqual(first.out.result.fixes.skipped, []);
  assert.ok(first.out.result.fixes.fixed.length >= 3);
  const autoLeft = first.out.result.findings.filter((f) => f.fix_mode === "auto");
  assert.deepEqual(autoLeft, []);
  const view = readFileSync(join(d, "views/product-card/view.tsx"), "utf8");
  assert.match(view, /<AppsSDKUIProvider linkComponent="a">/);
  assert.match(view, /const theme = useViewTheme\(\)/);
  assert.match(view, /attachments\.map\(\(\{ key, block \}\) => \[key, block\] as const\)/);
  assert.match(readFileSync(join(d, "views/product-card/view.css"), "utf8"), /@source "\.\.\/\.\.\/node_modules\/@openai\/apps-sdk-ui";/);
  assert.match(readFileSync(join(d, "legacy.ts"), "utf8"), /from "mcp-use"/);
  assert.match(readFileSync(join(d, "index.ts"), "utf8"), /supportsViews\(\)/);
  // manual and suggest findings remain
  assert.ok(first.out.result.findings.some((f) => f.rule_id === "CG-T01"));
  // idempotent: commit then fix again => nothing fixed
  git("add", "-A"); git("commit", "-q", "-m", "fixed");
  const second = runScan(d, ["--host", "chatgpt", "--fix"]);
  assert.deepEqual(second.out.result.fixes.fixed, []);
});

test("--fix refuses a dirty or non-git tree without --force", () => {
  const d = mkdtempSync(join(tmpdir(), "nogit-"));
  cpSync(fx("f15"), d, { recursive: true });
  const r = runScan(d, ["--host", "chatgpt", "--fix"]);
  assert.deepEqual(r.out.result.fixes.fixed, []);
  assert.ok(r.out.result.fixes.skipped.length > 0);
  const forced = runScan(d, ["--host", "chatgpt", "--fix", "--force"]);
  assert.ok(forced.out.result.fixes.fixed.length > 0);
});

test("scan of a non-Node project is out of scope (exit 4)", () => {
  const r = runScan(join(root, "tests", "controls", "c6-python-fastmcp"));
  assert.equal(r.status, 4);
});
