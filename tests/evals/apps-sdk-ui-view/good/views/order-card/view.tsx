import { useToolContext } from "mcp-use/react";
import { AppsSDKUIProvider } from "@openai/apps-sdk-ui/components/AppsSDKUIProvider";
import { Badge } from "@openai/apps-sdk-ui/components/Badge";
import { Button } from "@openai/apps-sdk-ui/components/Button";

export default function OrderCard() {
  const context = useToolContext<"lookup-order">();
  if (context.status === "pending") return <p>Loading…</p>;
  if (context.status === "error") return <p>{context.error.message}</p>;
  const { status, total } = context.toolOutput;
  return (
    <AppsSDKUIProvider linkComponent="a">
      <div className="p-4">
        <Badge color="info">{status}</Badge>
        <p>${total.toFixed(2)}</p>
        <Button color="primary">Track order</Button>
      </div>
    </AppsSDKUIProvider>
  );
}
