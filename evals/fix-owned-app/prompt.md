---
name: fix-owned-app
description: Fix an Archestra Owned App so the save gate accepts it
tags:
- archestra
- owned-app
max_turns: 12
timeout_seconds: 420
allowed_tools:
- Read
- Glob
- Grep
- Skill
---

This single-file Archestra app is rejected when I save it. Fix it so Archestra accepts it and works as intended, and write the result to `app.html`.

```html
<div id="app">
<link rel="stylesheet" href="/static/archestra-app-base.css">
<script src="https://app.archestra.ai/archestra-app-sdk.js"></script>
<form id="f"><input id="q"><button>Go</button></form>
<a id="docs" href="https://example.com/docs" target="_blank">Docs</a>
<ul id="list"></ul>
<script>
(async () => {
  await archestra.ready;
  document.getElementById("f").addEventListener("submit", async () => {
    await archestra.storage.set("filter", JSON.stringify({ q: document.getElementById("q").value }));
  });
  const r = await fetch("https://api.example.com/issues");
  document.getElementById("list").textContent = await r.text();
  localStorage.setItem("seen", "1");
})();
</script>
</div>
```
