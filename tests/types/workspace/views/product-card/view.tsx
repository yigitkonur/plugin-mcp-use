import { useToolContext } from "mcp-use/react";

export default function ProductCard() {
  const context = useToolContext<"show-product">();
  if (context.status !== "ready") return null;
  return <div>{context.toolOutput.title}</div>;
}
