import express from "express"; const app = express(); app.get("/health", (_q, r) => r.json({ ok: true })); app.listen(3000);
