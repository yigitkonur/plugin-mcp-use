import { useModelContext } from "mcp-use/react";

export default function Rows({ rowText }: { rowText: string }) {
  const { attachments, add, remove, pending } = useModelContext();
  const attached = attachments.some((a) => a.key === "selected-row");
  return (
    <div>
      <button type="button" disabled={pending || attached} onClick={async () => { await add("selected-row", { type: "text", text: rowText }); }}>Attach row</button>
      <button type="button" disabled={pending || !attached} onClick={async () => { await remove("selected-row"); }}>Remove attachment</button>
    </div>
  );
}
