# Changelog

## 0.11.1 - 2026-10-25

- fix: helper reads header comments and quoted keys like TOML does (241a2a8)
- fix: codex-plugin-project.sh matches TOML tables by parsed key path and trusts untrusted projects (3d4805b)

## 0.11.0 - 2026-10-25

- fix: name the file on each guard line for multi-file patches (8ba0a57)
- feat: run in Codex as well (b240c69)
- chore: hash the vendor llms.txt indexes so new pages count as drift (0f3452e)

## 0.10.0 - 2026-10-25

- fix: keep unpublished weekly work, latest gate covers F02, track the new OpenAI pages (53b0a84)
- feat: track upstream 2026-10-25, add /mcp-use:upgrade and a weekly upkeep job (829a3fe)
- ci: shared release.py + release.yml (docs-only pushes no longer release; validate.mjs is the gate) (f8cb7b5)

