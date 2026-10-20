# Eval results

Run 2026-10-20 with `claude plugin eval` 2.1.302: agent model `sonnet`, judge `sonnet`, 3 runs per arm per case, with/without ablation, report kept local (`--no-publish`). Cases and graders live in `evals/`; `tests/evals.test.mjs` proves each regex grader passes a known-good output and fails a known-bad one.

| Case | With plugin | Without | Δ | Skill fired (3 runs) | Graders |
|---|---|---|---|---|---|
| chatgpt-ready-tool | 1.00 | 0.38 | +0.62 | 3/3 | 6 |
| fix-owned-app | 1.00 | 0.19 | +0.81 | 3/3 | 8 |
| port-sdk-tool | 1.00 | 0.30 | +0.70 | 3/3 | 7 |
| server-settings | 1.00 | 0.50 | +0.50 | 3/3 | 5 |
| view-attachments | 1.00 | 0.50 | +0.50 | 3/3 | 4 |
| apps-sdk-ui-view | 1.00 | 0.75 | +0.25 | 3/3 | 6 |

Mean with 1.00, without 0.44, Δ +0.56. The plugin beat the no-plugin baseline on 6 of 6 cases (target: at least 80%).
List-price cost of the six valid case runs: about $2.37.

## How to read this
- Scores are the weighted share of graders that passed. Most regex graders check for facts the plugin states (three annotations, `outputSchema`, no `mcp-use/server` import, `server.settings` field shape, `attachments` as an array, `linkComponent`, Owned-App save-gate rules); the `caveats` grader in `port-sdk-tool` is a judge rubric (HTTP-only and zod 4 notes).
- `skill-fired` is excluded from the score in two-arm runs; it is reported as an indicator.
- The smallest gain is `apps-sdk-ui-view` (a view without the provider also passes the `provider-link` grader; the baseline misses `useToolContext` and status narrowing). Its first run exposed an over-strict grader (it failed correct views that omit the optional provider); the grader was fixed and the case re-run.

## What went wrong and how it was handled
- The first full run hit the account's weekly usage limit part-way: 12 of 36 runs ended with an API error and scored 0 without grading. Those two cases (`server-settings`, `view-attachments`) were re-run; the table uses only runs without errors.
- Results are from one model and one judge; a different model or judge can score differently. `--model` and `--judge-model` should be pinned when re-running.
- The docs MCP servers were not started in these runs (no mocks), so the skills carried the whole knowledge load.

Re-run: `claude plugin eval . --runs 3 --ablation with-without --allow-tools Write Edit --model sonnet --judge-model sonnet --no-publish` (costs real model calls).
