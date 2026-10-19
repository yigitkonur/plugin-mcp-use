#!/bin/sh
# Scaffold a new mcp-use v2 project with create-mcp-use-app (ported from the build-mcp-use-server skill's
# scaffold script; flags re-verified against create-mcp-use-app@2.1.0 on 2026-10-20).
# Usage: scaffold.sh <mcp-server|mcp-apps|blank> <name> [npm|pnpm|bun] [--no-skills] [--no-install] [--dry-run]
set -eu
TEMPLATE="${1:-}"; NAME="${2:-}"; PM="${3:-npm}"
case "$PM" in --*) PM=npm; shift 2 ;; *) shift 3 2>/dev/null || shift $# ;; esac
SKILLS="--skills"; INSTALL="--install"; DRY=0
for a in "$@"; do
  case "$a" in
    --no-skills) SKILLS="--no-skills" ;;
    --no-install) INSTALL="--no-install" ;;
    --dry-run) DRY=1 ;;
    *) echo "scaffold: unknown option $a" >&2; exit 3 ;;
  esac
done
[ -n "$TEMPLATE" ] && [ -n "$NAME" ] || { echo "usage: scaffold.sh <mcp-server|mcp-apps|blank> <name> [npm|pnpm|bun] [--no-skills] [--no-install] [--dry-run]" >&2; exit 3; }
case "$TEMPLATE" in mcp-server|mcp-apps|blank) ;; *) echo "scaffold: unknown template '$TEMPLATE' (mcp-server, mcp-apps, blank)" >&2; exit 3 ;; esac
case "$PM" in npm|pnpm|bun) ;; *) echo "scaffold: unknown package manager '$PM' (npm, pnpm, bun)" >&2; exit 3 ;; esac
case "$NAME" in *[!A-Za-z0-9._-]*|"") echo "scaffold: project name may contain letters, digits, . _ - only" >&2; exit 3 ;; esac
[ ! -e "$NAME" ] || { echo "scaffold: '$NAME' already exists; refusing to overwrite" >&2; exit 1; }
CMD="npx --yes create-mcp-use-app@latest $NAME --template $TEMPLATE --$PM $INSTALL $SKILLS"
echo "scaffold: $CMD"
[ "$DRY" = "1" ] && exit 0
# Cold npm cache plus a full install can take minutes; the caller sets the time limit.
$CMD </dev/null
[ -f "$NAME/package.json" ] && [ -f "$NAME/index.ts" ] || { echo "scaffold: expected $NAME/package.json and $NAME/index.ts after scaffolding" >&2; exit 1; }
echo "scaffold: ok $NAME"
