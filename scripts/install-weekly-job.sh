#!/bin/sh
# Install (or remove) the weekly launchd job that runs scripts/weekly-update.sh on this Mac.
# usage: install-weekly-job.sh [--uninstall] [--status]
# Schedule: every Monday 09:17 local time; launchd runs a missed job once when the Mac wakes.
set -eu
LABEL="dev.plugin-mcp-use.weekly"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
DOMAIN="gui/$(id -u)"

case "${1:-}" in
  --uninstall) launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true; rm -f "$PLIST"; echo "removed $LABEL"; exit 0 ;;
  --status) launchctl print "$DOMAIN/$LABEL" 2>&1 | grep -E "state|path|program|run interval|last exit|next" | head -10 || true; exit 0 ;;
  "") ;;
  *) echo "usage: install-weekly-job.sh [--uninstall] [--status]" >&2; exit 3 ;;
esac

mkdir -p "$HOME/Library/LaunchAgents"
cat >"$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array><string>/bin/sh</string><string>$REPO/scripts/weekly-update.sh</string></array>
  <key>StartCalendarInterval</key>
  <dict><key>Weekday</key><integer>1</integer><key>Hour</key><integer>9</integer><key>Minute</key><integer>17</integer></dict>
  <key>EnvironmentVariables</key>
  <dict><key>PLUGIN_MCP_USE_REPO</key><string>$REPO</string></dict>
  <key>RunAtLoad</key><false/>
</dict>
</plist>
EOF
plutil -lint "$PLIST" >/dev/null
launchctl bootout "$DOMAIN/$LABEL" 2>/dev/null || true
launchctl bootstrap "$DOMAIN" "$PLIST"
echo "installed $LABEL -> $REPO/scripts/weekly-update.sh, Mondays 09:17; log: ~/Library/Logs/plugin-mcp-use-weekly.log"
echo "run it now: launchctl kickstart $DOMAIN/$LABEL   (or: sh scripts/weekly-update.sh --force)"
