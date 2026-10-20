# Migration method

The order matters because each step produces the evidence the next one needs. Stop conditions are listed so a half-ported project never looks finished.

## Before touching code
- **Clean tree.** Ask the user to commit or stash. A migration is easiest to review and undo as one commit (or one branch).
- **Pick the shape.** In place (replace the files, keep the repo) is the default for a small server; a new directory is better when the old one still serves production traffic. Either way the old server must stay runnable until parity passes.
- **Questions that change the work** (ask once): transport (stdio becomes HTTP), auth (none, bearer, own OAuth server), state (session maps), widgets (now or later), deploy target (the old Dockerfile or start command changes).

## Baseline rules
1. Sample calls are **read-only**. Derive arguments from each tool's `inputSchema`; prefer values the server's own tests or README use. Skip tools that write; they are checked by `tools/list` and by reading the handler.
2. If the old server needs secrets or a database to answer, give the probe a way to run it against fixtures or a dev database; if that is impossible, snapshot lists only and mark the call parity UNVERIFIED.
3. Keep `before.json` and `after.json` under `.mcp-use-plugin/migration/` (gitignored). They contain tool arguments and results: do not commit them.
4. A baseline that fails (server crashes, no response) means the old server is broken or misconfigured. Report that; do not "migrate around" it.

## Porting loop
For each construct: change it, `mcp-use typecheck`, and (for tools) call it once through the probe. Keep the old file until the end of its step so the diff is readable. Use `references/official-sdk.md` for the mapping and `${CLAUDE_PLUGIN_ROOT}/skills/mcp-use-server/SKILL.md` for the rules that apply to the result (annotations, `outputSchema`, errors as `isError`, exported tool constants).

Things that need a decision rather than a mechanical port, each one a question to the user:
- a tool with side effects and no annotations (decide `destructiveHint` and `openWorldHint` from the handler);
- session or per-connection state;
- a hand-written authorization server;
- server-initiated sampling (removed in mcp-use);
- a tool whose result mixes text and structured data without an `outputSchema`.

## Done means
- `mcp-use-probe --diff` is empty, or every line is classified intended with a reason (`parity.md`).
- `mcp-use typecheck` exits 0 and `mcp-use dev` serves the same tools.
- The old SDK packages are no longer direct dependencies in `package.json`, the old transport glue is deleted, scripts point at `mcp-use`. (`npm ls @modelcontextprotocol/server` still lists the package under `mcp-use`, which depends on it; that is expected.)
- Client configuration is updated or the exact change is written down for the user.
- Read-only sample calls return the same `structuredContent` (or an intended change).

## Stop and ask when
- the baseline cannot run; the diff shows a lost tool, resource or prompt; a handler depends on session state you cannot move; the project is not on the official SDK; typecheck fails three times for different reasons.

Sources: M1, M2, S12, S20.
