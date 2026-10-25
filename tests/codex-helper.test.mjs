import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, realpathSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const script = join(dirname(fileURLToPath(import.meta.url)), "..", "scripts", "codex-plugin-project.sh");
const have = spawnSync("python3", ["-c", "import tomllib"]).status === 0;
const setup = (cfg) => {
  const base = realpathSync(mkdtempSync(join(tmpdir(), "cph-")));
  const home = join(base, "home"), proj = join(base, "proj");
  mkdirSync(home); mkdirSync(proj);
  writeFileSync(join(home, "config.toml"), cfg(proj));
  const run = (...args) => spawnSync("sh", [script, ...args], { env: { ...process.env, CODEX_HOME: home }, encoding: "utf8" });
  const toml = (f) => spawnSync("python3", ["-c", "import tomllib,sys,json;print(json.dumps(tomllib.load(open(sys.argv[1],'rb'))))", f], { encoding: "utf8" });
  return { home, proj, run, user: () => JSON.parse(toml(join(home, "config.toml")).stdout), project: () => JSON.parse(toml(join(proj, ".codex", "config.toml")).stdout) };
};
const ID = "mcp-use@plugin-mcp-use";

test("helper: a single-quoted plugin header is the same table (no duplicate), a following indented table is untouched", { skip: !have }, () => {
  const t = setup(() => `[plugins.'${ID}']\nenabled = true\n\n  [other.thing]\n  enabled = true\n`);
  assert.equal(t.run("global-off", ID).status, 0);
  const u = t.user();
  assert.equal(u.plugins[ID].enabled, false);
  assert.equal(u.other.thing.enabled, true);
});

test("helper: --trust flips an untrusted project; without --trust it says so", { skip: !have }, () => {
  const t = setup((proj) => `[projects."${proj}"]\ntrust_level = "untrusted"`);
  assert.match(t.run("on", ID, t.proj).stdout, /not trusted/);
  assert.equal(t.user().projects[t.proj].trust_level, "untrusted");
  assert.equal(t.run("on", ID, t.proj, "--trust").status, 0);
  assert.equal(t.user().projects[t.proj].trust_level, "trusted");
  assert.equal(t.project().plugins[ID].enabled, true);
  t.run("off", ID, t.proj);
  assert.equal(t.project().plugins[ID].enabled, false);
});

test("helper: a ']' in a header comment and a quoted \"trust_level\" key are read as TOML reads them", { skip: !have }, () => {
  const t = setup((proj) => `[plugins."${ID}"] # [installed]\nenabled = true\n\n[projects."${proj}"]\n"trust_level" = "untrusted" # was off\n`);
  assert.equal(t.run("on", ID, t.proj, "--trust").status, 0);
  assert.equal(t.run("global-off", ID).status, 0);
  const u = t.user(); // a duplicate key or table would make this unparseable
  assert.equal(u.plugins[ID].enabled, false);
  assert.equal(u.projects[t.proj].trust_level, "trusted");
});
