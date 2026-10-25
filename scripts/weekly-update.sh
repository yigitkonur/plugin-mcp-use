#!/bin/sh
# Weekly upkeep for this plugin. Run by launchd (scripts/install-weekly-job.sh) or by hand.
#   1. makes a throwaway git worktree from origin/main (your working copy is never touched)
#   2. runs `node scripts/drift.mjs`: npm latest vs data/versions.json, vendor pages vs data/doc-hashes.json
#   3. no drift -> stops. Drift -> a headless Claude session follows AGENTS.md "Keeping up with upstream":
#      understand the differences, update references/rules/fixtures, run the gates, push a branch, open a PR,
#      merge it when CI is green. The release workflow then bumps, tags and publishes; installs auto-update.
# usage: weekly-update.sh [--force] [--dry]
#   --force  run the Claude session even when there is no drift (useful to test the job)
#   --dry    stop after the drift check (no Claude session)
# env: PLUGIN_MCP_USE_REPO (clone to use; default: the clone this script is in), WEEKLY_MODEL (default sonnet),
#      WEEKLY_BUDGET_USD (default 15), WEEKLY_TIMEOUT_SECS (default 5400)
set -u
FORCE=0; DRY=0
for a in "$@"; do case "$a" in --force) FORCE=1 ;; --dry) DRY=1 ;; *) echo "weekly-update: unknown option $a" >&2; exit 3 ;; esac; done

PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.local/bin:$PATH"; export PATH
REPO="${PLUGIN_MCP_USE_REPO:-$(cd "$(dirname "$0")/.." && pwd)}"
LOGDIR="$HOME/Library/Logs"; [ -d "$LOGDIR" ] || LOGDIR="$HOME/.local/state"
mkdir -p "$LOGDIR"; LOG="$LOGDIR/plugin-mcp-use-weekly.log"
exec >>"$LOG" 2>&1
DATE=$(date +%Y-%m-%d-%H%M)
echo; echo "===== weekly-update $DATE (repo $REPO, force=$FORCE dry=$DRY)"

notify() { command -v osascript >/dev/null 2>&1 && osascript -e "display notification \"$1\" with title \"plugin-mcp-use weekly\"" >/dev/null 2>&1; echo "notify: $1"; }
for tool in git node gh; do command -v $tool >/dev/null 2>&1 || { echo "missing $tool"; notify "missing $tool, nothing done"; exit 2; }; done

cd "$REPO" || exit 2
git fetch -q origin main || { notify "git fetch failed"; exit 2; }
# keep the clone itself current when that is harmless (so the next run uses the newest script)
if [ "$(git rev-parse --abbrev-ref HEAD)" = "main" ] && [ -z "$(git status --porcelain)" ]; then git merge -q --ff-only origin/main 2>&1 | tail -1; fi

WORK="$HOME/.cache/plugin-mcp-use-weekly/$DATE"; BRANCH="weekly/$DATE"
mkdir -p "$(dirname "$WORK")"
git worktree add -q -b "$BRANCH" "$WORK" origin/main || { notify "worktree failed"; exit 2; }
cleanup() { cd "$REPO" && git worktree remove --force "$WORK" 2>&1 | tail -1; git branch -D "$BRANCH" >/dev/null 2>&1; }
cd "$WORK" || exit 2

DRIFT="$(dirname "$WORK")/drift-$DATE.txt"
node scripts/drift.mjs >"$DRIFT" 2>&1; CODE=$?
cat "$DRIFT"
if [ $CODE -eq 0 ] && [ $FORCE -eq 0 ]; then echo "no drift"; notify "no drift, nothing to update"; cleanup; exit 0; fi
if [ $DRY -eq 1 ]; then echo "dry run: drift exit $CODE, stopping before the Claude session"; cleanup; exit 0; fi

CLAUDE="$(command -v claude 2>/dev/null || true)"; [ -x "$CLAUDE" ] || CLAUDE="$HOME/.local/bin/claude"
[ -x "$CLAUDE" ] || { notify "claude not found"; cleanup; exit 2; }

PROMPT="You are the weekly upkeep job for this Claude Code plugin. The current directory is a git worktree on branch $BRANCH, made from origin/main; work only here. Read AGENTS.md, section 'Keeping up with upstream', and follow it exactly. The drift report from this run is in $DRIFT (exit code $CODE; $( [ $FORCE -eq 1 ] && echo 'this run was forced, so there may be no drift: then report that nothing needs to change, refresh nothing, and stop' || echo 'drift was found' )). Do: understand each upstream difference from primary sources (release notes, type declaration diffs, vendor page diffs), update the references, rules, api-facts, checklists and fixtures that it affects and add anything new that is now in use, run every gate listed in AGENTS.md at the latest versions, update data/versions.json (known_good = last verified) and data/doc-hashes.json, commit, push the branch, open a pull request whose body lists each difference with its evidence, wait for CI, and merge it only if CI is green and every gate passed; otherwise leave the PR open and say why. Never force-push, never print secrets, never touch files outside this worktree. End with a summary of at most 12 lines."

echo "starting headless session (model ${WEEKLY_MODEL:-sonnet})"
perl -e 'alarm shift; exec @ARGV' "${WEEKLY_TIMEOUT_SECS:-5400}" "$CLAUDE" -p "$PROMPT" \
  --model "${WEEKLY_MODEL:-sonnet}" --effort high --max-budget-usd "${WEEKLY_BUDGET_USD:-15}" \
  --setting-sources project,local --no-session-persistence --output-format text \
  --allowedTools Bash Read Edit Write Grep Glob WebFetch WebSearch Agent \
  --disallowedTools "Bash(git push --force:*)" "Bash(git push -f:*)" </dev/null
RC=$?
echo "session exit $RC"
PR=$(gh pr list --head "$BRANCH" --json number,state --jq '.[0] | "#\(.number) \(.state)"' 2>/dev/null)
notify "session exit $RC, PR: ${PR:-none}"
cleanup
exit $RC
