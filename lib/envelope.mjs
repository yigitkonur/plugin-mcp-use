// Shared output contract for every bin/ tool (04 §4.4).
// Exit codes: 0 clean · 1 warnings only · 2 errors found · 3 usage · 4 out of scope · 5 probe/network failure.
export const EXIT = { OK: 0, WARN: 1, ERROR: 2, USAGE: 3, SCOPE: 4, NETWORK: 5 };

export function envelope(tool, { ok = true, result = null, next_actions = [], error = null } = {}) {
  return { ok, schema_version: "1", tool, result, next_actions, error };
}

export function emit(obj, json) {
  process.stdout.write(json ? JSON.stringify(obj) + "\n" : obj);
}

export function fail(tool, code, message, suggestion, exit = EXIT.USAGE, json = true) {
  const e = envelope(tool, { ok: false, error: { code, message, suggestion } });
  if (json) process.stdout.write(JSON.stringify(e) + "\n");
  else process.stderr.write(`${tool}: ${message}${suggestion ? `\n  ${suggestion}` : ""}\n`);
  process.exit(exit);
}
