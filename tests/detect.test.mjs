import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const detect = join(root, "bin", "mcp-use-detect");

// Recorded from `mcp-use-detect --dir <fixture>` on 2026-10-21. [directory, scenario, secondary scenarios, declared hosts, inferred hosts]
const RECORDED = [
  ["tests/fixtures/f02", "MIGRATE", [], [], []],
  ["tests/fixtures/f03", "MIGRATE", [], [], []],
  ["tests/fixtures/f11", "MIGRATE", [], [], ["chatgpt"]],
  ["tests/fixtures/f13", "ADD_APPS", [], [], []],
  ["tests/fixtures/f14", "IMPROVE_HOST", [], [], ["chatgpt"]],
  ["tests/fixtures/f15", "LEGACY_V1", ["IMPROVE_HOST"], [], ["chatgpt"]],
  // F16 and p-ar declare their host in a tracked .mcp-use-plugin/settings.md (a fresh clone must see it).
  ["tests/fixtures/f16", "ADD_HOST", [], ["archestra"], []],
  ["tests/fixtures/p-ar", "ADD_HOST", ["OWNED_APP"], ["archestra"], ["chatgpt"]],
  ["tests/fixtures/p-auth", "ADD_APPS", [], [], []],
  ["tests/fixtures/p-defects", "IMPROVE_HOST", [], [], ["chatgpt"]],
  ["tests/controls/c1-vite-react", "NONE", [], [], []],
  ["tests/controls/c2-express-api", "NONE", [], [], []],
  ["tests/controls/c3-next-no-mcp", "NONE", [], [], []],
  ["tests/controls/c4-mcp-json-only", "NONE", [], [], []],
  ["tests/controls/c5-mcp-use-client-only", "NONE", [], [], []],
  ["tests/controls/c6-python-fastmcp", "OUT_OF_SCOPE", [], [], []],
  ["tests/controls/c7-go-mcp", "OUT_OF_SCOPE", [], [], []],
  ["tests/controls/c8-empty", "NONE", [], [], []],
];

for (const [dir, scenario, secondary, declared, inferred] of RECORDED) {
  test(`detect ${dir}: ${scenario}`, () => {
    const r = spawnSync("node", [detect, "--dir", join(root, dir)], { encoding: "utf8", timeout: 30000 });
    const out = JSON.parse(r.stdout).result;
    assert.equal(out.scenario, scenario);
    assert.deepEqual(out.secondary, secondary);
    assert.deepEqual(out.hosts.declared, declared);
    assert.deepEqual(out.hosts.inferred, inferred);
  });
}
