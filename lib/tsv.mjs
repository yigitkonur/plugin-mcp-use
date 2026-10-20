import { readFileSync } from "node:fs";

// Tab-separated rows; lines starting with # and blank lines are skipped. The first non-comment row is data (no header).
export function readTsv(path, columns) {
  const rows = [];
  for (const line of readFileSync(path, "utf8").split("\n")) {
    if (!line.trim() || line.startsWith("#")) continue;
    const cells = line.split("\t");
    const row = {};
    columns.forEach((c, i) => { row[c] = cells[i] ?? ""; });
    rows.push(row);
  }
  return rows;
}
