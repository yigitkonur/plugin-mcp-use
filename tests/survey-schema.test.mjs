import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { validate } from "../lib/jsonschema.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const schema = JSON.parse(readFileSync(join(root, "data/schemas/survey.schema.json"), "utf8"));
const dir = join(root, "tests/fixtures/survey-samples");

// Recorded from real server-surveyor sessions on F02 (v1, stdio) and F03 (v2, HTTP).
for (const f of readdirSync(dir).filter((n) => n.endsWith(".json"))) {
  test(`server-surveyor output ${f} is valid against survey.schema.json`, () => {
    assert.deepEqual(validate(schema, JSON.parse(readFileSync(join(dir, f), "utf8"))), []);
  });
}

test("survey schema rejects a read-only call on a writing tool", () => {
  const sample = JSON.parse(readFileSync(join(dir, "f02.json"), "utf8"));
  sample.tools[1].read_only_call = true;
  assert.notEqual(validate(schema, sample).length, 0);
});
