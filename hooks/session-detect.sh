#!/bin/sh
# H1 SessionStart: print a short brief only in Node projects that contain an MCP server signal.
# Always exits 0. Silent when: MCP_USE_PLUGIN=off, settings enabled: false, node missing, no package.json, no signal.
[ "${MCP_USE_PLUGIN:-}" = "off" ] && exit 0
command -v node >/dev/null 2>&1 || exit 0
INPUT=$(cat)
ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
CWD=$(printf '%s' "$INPUT" | sed -n 's/.*"cwd"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)
[ -n "$CWD" ] && [ -d "$CWD" ] && DIR="$CWD"
cd "$DIR" 2>/dev/null || exit 0
. "$ROOT/hooks/lib-signal.sh"
mcp_use_disabled && exit 0
mcp_use_has_signal || exit 0
printf '%s' "$INPUT" | node "$ROOT/bin/mcp-use-detect" --dir "$DIR" --brief --format hook 2>/dev/null
exit 0
