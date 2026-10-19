# Plugin review and submission (ChatGPT)

Source: OpenAI plugin guidelines (O4), 2026-10-20. The page ends at Skills; the submission-portal flow is a separate page that was not read, so portal steps are not covered here. Everything below is a human or organization task; none of it is automatable from code.

**Publisher and support:** verified individual or organization publisher; a current support contact. **Plugin:** stable and complete (not a demo), tested on **desktop and mobile**, general-audience content, no ads, no scraping or unofficial connectors.
**Name and listing:** no generic single-word names, no "MCP", "Server" or "Plugin" suffix, no implied OpenAI endorsement; descriptions without pricing or comparisons; example prompts provided.
**Tools:** explicit annotations (`metadata.md`); unique verb-based names; accurate descriptions with side effects; minimal inputs; relevant-only responses.
**Data and privacy:** published privacy policy (categories, purposes, recipients, retention, controls); minimal data collection; **restricted data prohibited** (API keys, passwords, MFA/OTP codes, and similar); no full conversation history in inputs.
**Auth:** if the server needs sign-in, provide a **demo account with sample data** (no sign-up, no inaccessible 2FA); disclose all requested permissions and keep scopes minimal.
**UI:** `_meta.ui.domain` set and unique; declared CSP matches behavior; iframe use (own registrable domain only) needs a written justification (`csp-and-iframes.md`).
**Commerce:** physical goods only, with external checkout.
**After submission:** plugins found in violation may be removed.

The plugin's `CG-S01` checklist item reports these as TODOs with an owner; `mcp-use-scan` cannot verify them.

Sources: O4.
