// Strict argument parsing and input checks shared by the bin/ tools. A bad flag, a missing value or a path that does not
// exist is a usage error (exit 3; the envelope under --json), never a silent "clean" result.
import { parseArgs } from "node:util";
import { statSync } from "node:fs";
import { fail, EXIT } from "./envelope.mjs";

export function usage(tool, message, json = false, suggestion = `run ${tool} --help`) {
  fail(tool, "usage", message, suggestion, EXIT.USAGE, json);
}

// `quiet`: for hook invocations, which must never fail a session.
export function parseCli(tool, options, { argv = process.argv.slice(2), positionals = false, quiet = false } = {}) {
  try {
    return parseArgs({ args: argv, options: { help: { type: "boolean", short: "h" }, ...options }, strict: true, allowPositionals: positionals });
  } catch (e) {
    if (quiet) process.exit(0);
    const first = String(e.message).split("\n")[0].replace(/\. To specify .*$/, "").replace(/\.$/, "");
    usage(tool, first, argv.includes("--json"));
  }
}

export function kindOf(path) {
  try { const s = statSync(path); return s.isDirectory() ? "dir" : s.isFile() ? "file" : "other"; } catch { return null; }
}

export function requireDir(tool, path, flag, json) {
  const k = kindOf(path);
  if (k !== "dir") usage(tool, `${flag} ${path}: ${k === null ? "no such directory" : "not a directory"}`, json);
}

export function requireFile(tool, path, flag, json) {
  const k = kindOf(path);
  if (k !== "file") usage(tool, `${flag} ${path}: ${k === null ? "no such file" : "not a file"}`, json);
}
