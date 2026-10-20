#!/bin/sh
# Compile every <!-- fixture: --> example against the pinned mcp-use (data/versions.json known_good),
# and prove every <!-- fixture-bad: --> example is rejected. Workspace lives outside the repo.
set -u
HERE=$(cd "$(dirname "$0")/.." && pwd)
WS="${MCP_USE_WORK:-${TMPDIR:-/tmp}/mcp-use-plugin-fixtures}"
mkdir -p "$WS"
cp -R "$HERE/tests/types/workspace/." "$WS/"
if [ ! -d "$WS/node_modules/mcp-use" ] || [ "$(cat "$WS/.pkg-hash" 2>/dev/null)" != "$(shasum "$WS/package.json" | cut -d' ' -f1)" ]; then
  (cd "$WS" && npm install --no-audit --no-fund --loglevel=error) || { echo "npm install failed"; exit 2; }
  shasum "$WS/package.json" | cut -d' ' -f1 > "$WS/.pkg-hash"
fi
INSTALLED=$(node -p "require('$WS/node_modules/mcp-use/package.json').version")
KNOWN=$(node -p "require('$HERE/data/versions.json').packages['mcp-use'].known_good")
echo "mcp-use installed=$INSTALLED known_good=$KNOWN"
[ "$INSTALLED" = "$KNOWN" ] || { echo "FAIL: installed mcp-use differs from data/versions.json known_good"; exit 2; }
node "$HERE/scripts/check-api-facts.mjs" "$WS" || exit 1
mkdir -p "$WS/generated"
COUNTS=$(node "$HERE/scripts/extract-fixtures.mjs" "$WS/generated") || exit 2
echo "fixtures: $COUNTS"
cd "$WS" || exit 2
FAIL=0
if npx mcp-use typecheck >/tmp/fixtures-good.log 2>&1; then echo "good fixtures: compile OK"; else echo "good fixtures: FAIL"; cat /tmp/fixtures-good.log | head -60; FAIL=1; fi
for f in generated/bad/*; do
  [ -f "$f" ] || continue
  N=$(basename "$f")
  printf '{"extends":"./tsconfig.json","include":["mcp-env.d.ts","index.ts","views/**/*","%s"]}\n' "$f" > tsconfig.bad.json
  if npx tsc -p tsconfig.bad.json >/tmp/fixtures-bad-$N.log 2>&1; then echo "bad fixture $N: COMPILED (must fail)"; FAIL=1; else
    if grep -q "$f" /tmp/fixtures-bad-$N.log; then echo "bad fixture $N: rejected OK"; else echo "bad fixture $N: failed for another file"; head -5 /tmp/fixtures-bad-$N.log; FAIL=1; fi
  fi
done
rm -f tsconfig.bad.json
exit $FAIL
