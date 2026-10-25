// Codex writes files through apply_patch: the patch text arrives in tool_input.command, with one
// "*** Add File: / Update File: / Move to:" line per file, paths relative to the session's cwd.
const TAGS = ["*** Add File: ", "*** Update File: ", "*** Move to: "];
export const isPatch = (cmd) => typeof cmd === "string" && cmd.includes("*** Begin Patch");
export function patchPaths(cmd) {
  const out = [];
  if (!isPatch(cmd)) return out;
  for (const line of cmd.split("\n")) for (const t of TAGS) if (line.startsWith(t)) { out.push(line.slice(t.length).trim()); break; }
  return [...new Set(out)];
}
