import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync, cpSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { findBrokenRefs } from "../lib/refs.mjs";
import { installedWorkflows } from "../lib/detect.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const tmp = (p) => mkdtempSync(join(tmpdir(), p));
const put = (base, rel, text) => { mkdirSync(dirname(join(base, rel)), { recursive: true }); writeFileSync(join(base, rel), text); };
const git = (...a) => spawnSync("git", a, { cwd: root, encoding: "utf8" });
const inGit = git("rev-parse", "--is-inside-work-tree").stdout.trim() === "true";

// ---- backticked paths in the docs resolve ---------------------------------------------------------------
test("every backticked path in the shipped docs resolves", () => {
  assert.deepEqual(findBrokenRefs(root), []);
});

test("the reference check reports each kind of mistake and accepts the right spellings", () => {
  const d = tmp("refs-");
  put(d, "skills/a/SKILL.md", "---\nname: a\n---\n");
  put(d, "skills/a/references/x.md", "x\n");
  put(d, "skills/b/references/y.md", "y\n");
  put(d, "data/real.json", "{}\n");
  put(d, "skills/a/references/notes.md", [
    "ok: `x.md` is not a path; `references/x.md`, `${CLAUDE_PLUGIN_ROOT}/skills/b/references/y.md`, `data/real.json:3`, `skills/list`, `node_modules/p/dist/x.d.ts`",
    "bad: `references/missing.md`",
    "bad: `b/references/y.md`",
    "bad: `${CLAUDE_PLUGIN_ROOT}/skills/b/references/nope.md`",
    "bad: `data/missing.json`",
    "bad: `spikes/S1`",
    "```",
    "in a code fence: `data/ignored-in-fence.json`",
    "```",
  ].join("\n"));
  const got = findBrokenRefs(d).map((b) => `${b.line}:${b.ref}`).sort();
  assert.deepEqual(got, ["2:references/missing.md", "3:b/references/y.md", "4:${CLAUDE_PLUGIN_ROOT}/skills/b/references/nope.md", "5:data/missing.json", "6:spikes/S1"].sort());
  assert.match(findBrokenRefs(d).find((b) => b.ref === "b/references/y.md").problem, /\$\{CLAUDE_PLUGIN_ROOT\}\/skills\/b\/references\/y\.md/);
});

// ---- scripts/validate.mjs enforces it ---------------------------------------------------------------------
test("validate.mjs passes on a copy of the tree and fails when a doc points at a missing file", { skip: !inGit && "needs a git checkout to list the files" }, () => {
  const files = git("ls-files", "-z", "--cached", "--others", "--exclude-standard").stdout.split("\0").filter(Boolean);
  const copy = tmp("validate-copy-");
  for (const f of files) { if (existsSync(join(root, f))) { mkdirSync(dirname(join(copy, f)), { recursive: true }); cpSync(join(root, f), join(copy, f)); } }
  const ok = spawnSync("node", [join(copy, "scripts", "validate.mjs")], { encoding: "utf8" });
  assert.equal(ok.status, 0, ok.stderr);
  const readme = readFileSync(join(copy, "README.md"), "utf8");
  writeFileSync(join(copy, "README.md"), readme + "\nSee `references/official-sdk.md` and `data/nope.json`.\n");
  const bad = spawnSync("node", [join(copy, "scripts", "validate.mjs")], { encoding: "utf8" });
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /README\.md:\d+: `references\/official-sdk\.md`/);
  assert.match(bad.stderr, /README\.md:\d+: `data\/nope\.json`/);
});

// ---- commands the docs and the engine name exist, with the arguments the skills declare -----------------------
function skills() {
  const out = {};
  for (const name of readdirSync(join(root, "skills"))) {
    const fm = readFileSync(join(root, "skills", name, "SKILL.md"), "utf8").match(/^---\n([\s\S]*?)\n---/)[1];
    const hint = fm.match(/^argument-hint:\s*(.+)$/m)?.[1].trim().replace(/^"|"$/g, "").replace(/\\"/g, '"') ?? null;
    out[name] = { workflow: /disable-model-invocation:\s*true/.test(fm), hint };
  }
  return out;
}

test("README shows every workflow command with exactly the arguments its skill declares", () => {
  const readme = readFileSync(join(root, "README.md"), "utf8").replace(/\\\|/g, "|");
  for (const [name, s] of Object.entries(skills())) {
    if (!s.workflow || !s.hint) continue;
    assert.ok(readme.includes(`\`/mcp-use:${name} ${s.hint}\``), `README lacks \`/mcp-use:${name} ${s.hint}\``);
  }
});

test("detect.mjs knows exactly the workflow skills that exist", () => {
  const workflows = Object.entries(skills()).filter(([, s]) => s.workflow).map(([n]) => n).sort();
  assert.deepEqual([...installedWorkflows()].sort(), workflows);
});

test("every next_actions command the engine prints names an existing workflow skill", () => {
  const known = skills();
  let seen = 0;
  for (const dir of ["f02", "f03", "f11", "f13", "f14", "f15", "f16", "p-ar", "p-auth"]) {
    const r = spawnSync("node", [join(root, "bin", "mcp-use-detect"), "--dir", join(root, "tests", "fixtures", dir)], { encoding: "utf8" });
    for (const a of JSON.parse(r.stdout).next_actions) {
      const m = a.cmd.match(/^\/mcp-use:([\w-]+)/);
      assert.ok(m && known[m[1]]?.workflow, `${dir}: ${a.cmd}`);
      seen++;
    }
  }
  assert.ok(seen >= 9, "the fixtures produced next actions to check");
});

// ---- nothing a test depends on is hidden by .gitignore (a fresh clone must see the same fixtures) -------------
test("no file under tests/ is ignored by git", { skip: !inGit && "needs a git checkout" }, () => {
  const ignored = git("ls-files", "--others", "--ignored", "--exclude-standard", "tests").stdout.split("\n").filter((f) => f && !/(^|\/)node_modules\//.test(f) && !/\.DS_Store$|\.log$/.test(f));
  assert.deepEqual(ignored, []);
});
