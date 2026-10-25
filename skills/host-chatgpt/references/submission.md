# Plugin review and submission (ChatGPT)

Basis: OpenAI plugin guidelines (O4, 2026-10-20), the submission portal guide (O9) and the remote-MCP review page (O10), both read 2026-10-25 (S27). Everything below is a human or organization task; none of it is automatable from code, and `mcp-use-scan` cannot verify it. The plugin's `CG-S01` checklist item reports it as TODOs with an owner.

## What the review checks (O4)
**Publisher and support:** verified individual or organization publisher; a current support contact. **Plugin:** stable and complete (not a demo), tested on **desktop and mobile**, general-audience content, no ads, no scraping or unofficial connectors.
**Name and listing:** avoid overly generic names (especially single-word dictionary terms not tied to your brand); do not append "MCP", "MCP Server" or "Plugin" to a company or product name; no implied OpenAI endorsement; descriptions without pricing or comparisons; example prompts provided.
**Tools:** explicit annotations (`metadata.md`); unique verb-based names; accurate descriptions with side effects; minimal inputs; relevant-only responses.
**Data and privacy:** published privacy policy (categories, purposes, recipients, retention, controls); minimal data collection; **restricted data prohibited** (API keys, passwords, MFA/OTP codes, and similar); no full conversation history in inputs.
**Auth:** if the server needs sign-in, provide a **demo account with sample data** (no sign-up, no inaccessible 2FA); disclose all requested permissions and keep scopes minimal.
**UI:** `_meta.ui.domain` set and unique; declared CSP matches behavior; iframe use (normally your own registrable domain; third-party only when essential) needs a written justification (`csp-and-iframes.md`).
**Commerce:** physical goods only, with external checkout. **After submission:** plugins found in violation may be removed.

## The portal flow (O9, O10)
1. **Access.** Organization owners can submit; other members need **Apps Management Write**. Publishing under a name needs individual or business verification in the organization settings.
2. **Upload.** A plugin ZIP at platform.openai.com/plugins. If the plugin uses an MCP server, it must be in the **first** ZIP: adding an MCP server to an existing skills-only plugin is not supported. **One MCP server can be connected per plugin.** Keep secrets out of the ZIP.
3. **Server requirements.** Publicly reachable domain (no local or test endpoint); a CSP that allows the exact domains the component fetches from. Submit one universal URL; the **Template** URL form (`https://{workspace}.example.com/mcp`) is only for trusted developers with an established relationship and needs a real example URL.
4. **Connect and scan.** In **MCPs** choose **Connect**, check URL and authentication, complete the **domain-verification challenge**, authenticate if required, wait for the tool scan, read **Issues**, then **Reconnect** or **Rescan**.
5. **Domain verification.** Serve the exact token the portal shows as plain text (not JSON) at `https://<challenge-base-host>/.well-known/openai-apps-challenge`. The challenge base is an HTTPS origin on the MCP hostname or an eligible parent domain; paths are ignored. If another plugin uses the same challenge URL, use an allowed parent origin or a distinct hostname.
6. **Authentication in the portal.** No authentication, OAuth, and mixed unauthenticated/OAuth are supported. There is **no API-key or bearer-token flow** (Basic and custom-header declarations too), public submission rejects nonempty server `headers`, and a protected server must not be declared `type: "none"`. `private_key_jwt` needs signing-key setup that the portal guide does not describe: confirm with OpenAI first.
7. **Review information** (imported from `plugin.json` or entered in the portal): reviewer credentials if sign-in is needed (a dedicated test account with sample data that works without MFA, email or SMS codes, magic links or private-network access), **five positive and three negative test cases** (scenario, prompt, expected tools, expected result or safe fallback), a video walkthrough URL, release notes. Only one review can be active per plugin; rejection feedback arrives by email and is appealed by replying to it.

## After publication (O10)
OpenAI periodically fetches your server's tools and compares them with the published definitions (descriptions, schemas, annotations). **Deleted** tools disappear at the next scan; **new** tools are not available until they pass the automated checks; a **changed** tool keeps its previous definition live until the new one passes. Each tool passes independently, so keep the server compatible with the live definition while an update is held.

## Submitting a Claude Code plugin (O12)
A Claude plugin can be submitted skills-only (at least one `skills/<name>/SKILL.md`) or with a remote MCP server. OpenAI converts commands and agents to skills, requires hooks to be removed for the public directory, does not run `userConfig` prompts, rejects `.mcpb`, and cannot take an existing MCP server by reference. This plugin itself uses hooks and agents, so it is not submittable as is.

Sources: O4, O9, O10, O12, S27.
