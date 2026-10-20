import { useCallTool, useModelContext, useToolContext } from "mcp-use/react";

export default function Notes() {
  const ctx = useToolContext<"list-notes">();
  const save = useCallTool("save-note");
  const model = useModelContext();
  const close = () => window.openai.requestClose();
  void ctx; void save; void model; void close;
  return <button onClick={() => save.callTool({ text: "x" })}>Save</button>;
}
