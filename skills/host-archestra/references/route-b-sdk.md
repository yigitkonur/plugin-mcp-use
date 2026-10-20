# Route B: the `window.archestra` surface

The platform injects `window.archestra` into the page; never import or load an SDK yourself. Wait for `archestra.ready` before the first call. Methods return promises, except the three synchronous ones: `files.onChange`, `ui.updateModelContext` and `llm.prompt`. When the host connection cannot be made, `ready` and every promise-returning method reject.

```html
<script type="module">
  await archestra.ready;
  const notes = await archestra.storage.user.get("notes");   // null when nothing was saved yet
  document.body.textContent = notes ? notes.value.join(", ") : "No notes yet";
</script>
```

## Members
| Member | What it is |
|---|---|
| `user` | `{ id, name, email }` of whoever opened the app; no login flow needed |
| `context` | `{ appId, version }` |
| `storage.user` / `storage.shared` | JSON key-value stores: private per viewer / one store for all viewers |
| `files` | a per-viewer file store: `list, read, save, delete, onChange` |
| `tools` | `list()` the assigned tools plus built-in file tools; `call(name, args)` |
| `llm` | `complete(prompt, { system, jsonMode })`; `prompt` tagged template |
| `ui` | `openLink(url)`, `requestDisplayMode("inline" \| "fullscreen")`, `updateModelContext(text)` |

Only these members exist. Anything else (`archestra.tool`, `archestra.storage.get`) is a typo the lint reports (AW04, AW05).

## Storage
`get(key)` resolves to `{ value, revision, owner }` or `null`; `set(key, value, opts?)` to `{ revision, owner }`; `list()` to entries sorted by key; `delete(key)` to nothing.
- Pass objects directly (no `JSON.stringify`); a top-level `null` cannot be stored, call `delete`.
- After a `get` or `list`, a `set` of that key succeeds only if nobody wrote it since; otherwise it rejects `{ code: "conflict" }`: read again and retry. A `set` of an unread key is last-write-wins.
- `ifRevision: n` writes only if the revision matches (`0` = create, fail if it exists; `null` = no check). `owned: true` claims a new shared key for the viewer; other writers get `forbidden`.
- Browser storage (`localStorage`, `sessionStorage`, IndexedDB) throws without a sandbox domain and is private to one browser anyway.

## Files
`list(query?)` up to 200 entries `{ id, ref, filename, mimeType, sizeBytes, createdAt }`; `read(filename | {id} | {filename})` resolves to a browser `File`; `save(filename, data, opts?)` takes a string, `Blob`, `ArrayBuffer` or typed array (`opts.overwrite: false`, `opts.mimeType`); `delete(...)`; `onChange(listener)` returns an unsubscribe function and carries no payload (call `list()` again; not every host sends it, so also list when a picker opens). A filename is a plain name of at most 256 characters with no `/`, `\` or leading dot (AD14). Use files for documents, storage for structured state.

## Tools
`tools.list()` returns what the viewer may call; `tools.call(name, args)` takes the name exactly as listed (`github__list_issues`, AD09). Results resolve to the first of: `structuredContent`, `{ text, resources }` (file bodies in `resources[0].text`, or `dataUrl` for binary), JSON parsed from text, raw text, `{ media: [{ type, mimeType, dataUrl }] }` for image-only or audio-only (use `dataUrl` as the `src`), or `null`. Tools run as the viewer (personal, then team, then organization credentials); the app holds no tokens. When the viewer has not connected the server the call rejects `{ code: "auth_required", url }`: show the message with `url` as a link. Built-in `read_file` and `edit_file` can also be called here.

## LLM and host UI
`llm.complete` runs one completion as the viewer with the App Runtime LLM Agent's model (the app cannot choose); it cannot fetch anything. `prompt` takes up to 100,000 characters, `system` up to 10,000; `jsonMode` returns one JSON value you still parse. `ui.openLink` opens `http`/`https` in a new tab and is the only way to do so. `ui.updateModelContext` takes one short line; the model sees the first 500 characters and the latest call wins (AD12).

## Limits
| Item | Limit |
|---|---|
| App HTML | 512 KB |
| Storage value / key | 256 KB of JSON / 1 to 256 characters |
| Keys per partition | 1,000 (each viewer's private partition counts separately) |
| Files listed | 200 |
| Filename | 256 characters, plain name |
| `llm` prompt / system | 100,000 / 10,000 characters |
| Model context text | first 500 characters seen |

## Error codes
Errors carry `code`; invalid arguments throw a `TypeError` without one.
| Code | Meaning | Do |
|---|---|---|
| `auth_required` | tool's MCP server not connected, or must reconnect; has `url` | show link, retry after connect |
| `conflict` | key changed since read, or partition full | re-read, retry |
| `forbidden` | shared key owned by another viewer | tell the viewer; do not retry |
| `llm_quota` | usage limit or provider rate limit | back off |
| `llm_unavailable` | completion failed otherwise | show message |
| `tool_error` | any other failure (value over 256 KB, missing file) | show message |

Sources: A2, A3.
