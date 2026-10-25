#!/bin/sh
# Compile every <!-- fixture: --> example against mcp-use and prove every <!-- fixture-bad: --> example is rejected.
# Default: the versions in tests/types/workspace/package.json (data/versions.json known_good): reproducible, used by CI.
# --latest: the tracked packages at npm latest (a separate workspace): the drift check. A failure here means upstream
# changed something the examples rely on; see AGENTS.md "Keeping up with upstream".
# Workspace lives outside the repo.
set -u
HERE=$(cd "$(dirname "$0")/.." && pwd)
LATEST=0; [ "${1:-}" = "--latest" ] && LATEST=1
WS="${MCP_USE_WORK:-${TMPDIR:-/tmp}}/mcp-use-plugin-fixtures"
[ "$LATEST" = 1 ] && WS="$WS-latest"
mkdir -p "$WS" "$WS/logs"
cp -R "$HERE/tests/types/workspace/." "$WS/"
if [ "$LATEST" = 1 ]; then node "$HERE/scripts/latest-package-json.mjs" "$HERE/tests/types/workspace/package.json" "$WS/package.json" || exit 2; fi
if [ ! -d "$WS/node_modules/mcp-use" ] || [ "$(cat "$WS/.pkg-hash" 2>/dev/null)" != "$(shasum "$WS/package.json" | cut -d' ' -f1)" ]; then
  (cd "$WS" && npm install --no-audit --no-fund --loglevel=error) || { echo "npm install failed"; exit 2; }
  shasum "$WS/package.json" | cut -d' ' -f1 > "$WS/.pkg-hash"
fi
INSTALLED=$(node -p "require('$WS/node_modules/mcp-use/package.json').version")
KNOWN=$(node -p "require('$HERE/data/versions.json').packages['mcp-use'].known_good")
echo "mcp-use installed=$INSTALLED known_good=$KNOWN (latest mode: $LATEST)"
if [ "$LATEST" = 0 ]; then [ "$INSTALLED" = "$KNOWN" ] || { echo "FAIL: installed mcp-use differs from data/versions.json known_good"; exit 2; }; fi
node "$HERE/scripts/check-api-facts.mjs" "$WS" || exit 1
mkdir -p "$WS/generated"
COUNTS=$(node "$HERE/scripts/extract-fixtures.mjs" "$WS/generated") || exit 2
echo "fixtures: $COUNTS"
cd "$WS" || exit 2
FAIL=0
if npx mcp-use typecheck >"$WS/logs/good.log" 2>&1; then echo "good fixtures: compile OK"; else echo "good fixtures: FAIL"; cat "$WS/logs/good.log" | head -60; FAIL=1; fi
for f in generated/bad/*; do
  [ -f "$f" ] || continue
  N=$(basename "$f")
  printf '{"extends":"./tsconfig.json","include":["mcp-env.d.ts","index.ts","views/**/*","%s"]}\n' "$f" > tsconfig.bad.json
  if npx tsc -p tsconfig.bad.json >"$WS/logs/bad-$N.log" 2>&1; then echo "bad fixture $N: COMPILED (must fail)"; FAIL=1; else
    if grep -q "$f" "$WS/logs/bad-$N.log"; then echo "bad fixture $N: rejected OK"; else echo "bad fixture $N: failed for another file"; head -5 "$WS/logs/bad-$N.log"; FAIL=1; fi
  fi
done
rm -f tsconfig.bad.json
exit $FAIL
