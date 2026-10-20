# Shared pre-filter for the hooks (sourced, POSIX sh). Sets HAS=1 when the project looks like an MCP server project.
# A package.json (root, or up to three levels down, never inside node_modules) must name an MCP dependency,
# or the settings file must declare owned_app_paths. Only the first 60 package.json files found are read: a monorepo
# with more than 60 workspace manifests before the MCP package gets no hook output (explicit commands still work).
mcp_use_has_signal() {
  SIGNAL='"(mcp-use|@modelcontextprotocol/(sdk|server|ext-apps)|@openai/apps-sdk-ui)"[[:space:]]*:'
  HAS=0
  if [ -f package.json ] && grep -Eq "$SIGNAL" package.json; then HAS=1
  elif [ -f .mcp-use-plugin/settings.md ] && grep -Eq '^owned_app_paths:' .mcp-use-plugin/settings.md; then HAS=1
  elif [ "$(find . -maxdepth 3 -name package.json -not -path '*/node_modules/*' 2>/dev/null | head -60 | while IFS= read -r f; do if grep -Eqs "$SIGNAL" "$f"; then echo 1; break; fi; done)" = "1" ]; then HAS=1
  fi
  [ "$HAS" = "1" ]
}
mcp_use_disabled() {
  [ "${MCP_USE_PLUGIN:-}" = "off" ] && return 0
  [ -f .mcp-use-plugin/settings.md ] && grep -Eq '^enabled:[[:space:]]*(false|no|off|0)[[:space:]]*$' .mcp-use-plugin/settings.md && return 0
  return 1
}
