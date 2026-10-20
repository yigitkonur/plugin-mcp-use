import { useModelContext } from "mcp-use/react";

export default function Rows({ rowText }: { rowText: string }) {
  const { attachments, add, remove } = useModelContext();
  const attached = Object.entries(attachments).length > 0 && attachments["selected-row"];
  return (
    <div>
      <button type="button" onClick={() => add("selected-row", { type: "text", text: rowText })}>Attach row</button>
      <button type="button" onClick={() => remove("selected-row")}>Remove attachment</button>
      {attached ? "attached" : null}
    </div>
  );
}
