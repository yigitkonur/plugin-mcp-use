# S3 — `$ARGUMENTS` / `$N` on plugin skills
Toy skill `hello` (`disable-model-invocation: true`, body: `ARGS=[$ARGUMENTS] FIRST=[$0] SECOND=[$1]`).
- Typed: `claude -p "/toy:hello alpha beta"` → `ARGS=[alpha beta] FIRST=[alpha] SECOND=[beta]`, no tool calls.
- Model-invoked: `Skill {"skill":"toy:hello","args":"gamma delta"}` → refused: "The skill has model invocation disabled, so only you can run it."

**Decision:** workflow skills may rely on `$ARGUMENTS`/`$0`/`$1` when typed. They cannot be started by the model, so knowledge skills must tell the *user* which `/mcp-use:<workflow>` to type. They must not instruct the model to invoke a workflow skill.
