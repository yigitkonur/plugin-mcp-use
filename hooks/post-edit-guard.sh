#!/bin/sh
# H2 PostToolUse (Edit|Write): after a file edit, run the static rules on that one file and, only if there is a new
# error or warning, add a short nudge. Always exits 0; never blocks. Silent when: kill switch, node missing, the file
# is not a rule candidate, the project has no MCP signal, no new finding, or the finding was already reported this session.
[ "${MCP_USE_PLUGIN:-}" = "off" ] && exit 0
command -v node >/dev/null 2>&1 || exit 0
INPUT=$(cat)
FILE=$(printf '%s' "$INPUT" | sed -n 's/.*"file_path"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)
case "$FILE" in
  *.ts|*.tsx|*.mts|*.js|*.mjs|*.css|*/package.json|*.html) ;;
  *) exit 0 ;;
esac
case "$FILE" in */node_modules/*|*/.mcp-use/*|*/dist/*) exit 0 ;; esac
ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
CWD=$(printf '%s' "$INPUT" | sed -n 's/.*"cwd"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)
[ -n "$CWD" ] && [ -d "$CWD" ] && DIR="$CWD"
cd "$DIR" 2>/dev/null || exit 0
. "$ROOT/hooks/lib-signal.sh"
mcp_use_disabled && exit 0
mcp_use_has_signal || exit 0
printf '%s' "$INPUT" | node "$ROOT/bin/mcp-use-scan" --hook 2>/dev/null
exit 0
