#!/bin/sh
# Prepare the workspace for the migration fixtures (F02, F03, F11): installs the official MCP SDK packages pinned in
# tests/types/migration/package.json, copies each fixture next to a node_modules symlink, and prints the workspace path.
# Usage: scripts/migration-workspace.sh [--check] [--latest]
#   --check   also compiles every fixture with tsc
#   --latest  use the official SDK packages at npm latest in a separate workspace (the drift check) instead of the pins
set -u
HERE=$(cd "$(dirname "$0")/.." && pwd)
CHECK=0; LATEST=0
for a in "$@"; do case "$a" in --check) CHECK=1 ;; --latest) LATEST=1 ;; *) echo "migration-workspace: unknown option $a" >&2; exit 3 ;; esac; done
WS="${MCP_USE_WORK:-${TMPDIR:-/tmp}}/mcp-use-plugin-migration"
[ "$LATEST" = 1 ] && WS="$WS-latest"
mkdir -p "$WS/fixtures"
if [ "$LATEST" = 1 ]; then node "$HERE/scripts/latest-package-json.mjs" "$HERE/tests/types/migration/package.json" "$WS/package.json" >&2 || exit 2; else cp "$HERE/tests/types/migration/package.json" "$WS/package.json"; fi
if [ ! -d "$WS/node_modules/@modelcontextprotocol/sdk" ] || [ "$(cat "$WS/.pkg-hash" 2>/dev/null)" != "$(shasum "$WS/package.json" | cut -d' ' -f1)" ]; then
  (cd "$WS" && npm install --no-audit --no-fund --loglevel=error) >&2 || { echo "npm install failed" >&2; exit 2; }
  shasum "$WS/package.json" | cut -d' ' -f1 > "$WS/.pkg-hash"
fi
for f in f02 f03 f11; do
  rm -rf "$WS/fixtures/$f"
  cp -R "$HERE/tests/fixtures/$f" "$WS/fixtures/$f"
  # a fixture with its own install (zod 3) also gets the tracked SDK packages at latest under --latest
  if [ "$LATEST" = 1 ]; then node "$HERE/scripts/latest-package-json.mjs" "$HERE/tests/fixtures/$f/package.json" "$WS/fixtures/$f/package.json" >&2 || exit 2; fi
  if grep -q '"zod": "^3' "$HERE/tests/fixtures/$f/package.json"; then
    # a fixture on zod 3 (the usual state of an SDK v1 server) gets its own complete install from its package.json
    (cd "$WS/fixtures/$f" && npm install --no-audit --no-fund --loglevel=error) >&2 || { echo "npm install failed for $f" >&2; exit 2; }
  else
    ln -s ../../node_modules "$WS/fixtures/$f/node_modules"
  fi
done
if [ "$CHECK" = 1 ]; then
  FAIL=0
  # "before" snippets from the playbook (<!-- fixture-sdk1/sdk2 -->) must compile against the pinned official SDK
  mkdir -p "$WS/generated"
  COUNTS=$(node "$HERE/scripts/extract-fixtures.mjs" "$WS/generated") || exit 2
  echo "snippets: $COUNTS" >&2
  cp "$HERE/tests/types/migration/tsconfig.json" "$WS/tsconfig.json"
  if (cd "$WS" && npx tsc -p tsconfig.json >"$WS/tsc-snippets.log" 2>&1); then echo "sdk snippets: compile" >&2; else echo "sdk snippets: FAIL" >&2; head -30 "$WS/tsc-snippets.log" >&2; FAIL=1; fi
  for f in f02 f03 f11; do
    if (cd "$WS/fixtures/$f" && npx tsc -p . >"$WS/tsc-$f.log" 2>&1); then echo "$f: compiles" >&2; else echo "$f: FAIL" >&2; head -20 "$WS/tsc-$f.log" >&2; FAIL=1; fi
  done
  [ "$FAIL" = 0 ] || exit 1
fi
echo "$WS"
