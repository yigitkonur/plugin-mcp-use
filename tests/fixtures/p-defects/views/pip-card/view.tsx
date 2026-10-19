import { useToolContext } from "mcp-use/react";
export const viewConfig = { autoResize: true, displayModes: ["inline", "fullscreen", "pip"] as const };
export default function PipCard() {
  const c = useToolContext<"pip-card">();
  return <div>{c.status}</div>;
}
