#!/bin/sh
# H1 SessionStart: print a short brief only in Node projects that contain an MCP server signal.
# Always exits 0. Silent when: MCP_USE_PLUGIN=off, settings enabled: false, node missing, no package.json, no signal.
[ "$MCP_USE_PLUGIN" = "off" ] && exit 0
command -v node >/dev/null 2>&1 || exit 0
INPUT=$(cat)
ROOT="${CLAUDE_PLUGIN_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
DIR="${CLAUDE_PROJECT_DIR:-$(pwd)}"
CWD=$(printf '%s' "$INPUT" | sed -n 's/.*"cwd"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)
[ -n "$CWD" ] && [ -d "$CWD" ] && DIR="$CWD"
cd "$DIR" 2>/dev/null || exit 0
if [ -f .mcp-use-plugin/settings.md ] && grep -Eq '^enabled:[[:space:]]*(false|no|off|0)[[:space:]]*$' .mcp-use-plugin/settings.md; then exit 0; fi
SIGNAL='"(mcp-use|@modelcontextprotocol/(sdk|server|ext-apps)|@openai/apps-sdk-ui)"[[:space:]]*:'
HAS=0
if [ -f package.json ] && grep -Eq "$SIGNAL" package.json; then HAS=1
elif [ -f .mcp-use-plugin/settings.md ] && grep -Eq '^owned_app_paths:' .mcp-use-plugin/settings.md; then HAS=1
else
  # workspaces: look one or two levels down, never inside node_modules
  if find . -maxdepth 3 -name package.json -not -path '*/node_modules/*' 2>/dev/null | head -20 | xargs grep -Eqs "$SIGNAL" 2>/dev/null; then HAS=1; fi
fi
[ "$HAS" = "1" ] || exit 0
printf '%s' "$INPUT" | node "$ROOT/bin/mcp-use-detect" --dir "$DIR" --brief --format hook 2>/dev/null
exit 0
