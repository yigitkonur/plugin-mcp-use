import { useWidgetProps } from "mcp-use/react";
import { AppsSDKUIProvider } from "@openai/apps-sdk-ui/components/AppsSDKUIProvider";
import { Card } from "@openai/apps-sdk-ui/components/Card";
import { Badge } from "@openai/apps-sdk-ui/components/Badge";
import { Button } from "@openai/apps-sdk-ui/components/Button";

export default function OrderCard() {
  const props = useWidgetProps<{ status: string; total: number }>();
  return (
    <AppsSDKUIProvider>
      <Card>
        <Badge>{props.status}</Badge>
        <Button>Track order</Button>
      </Card>
    </AppsSDKUIProvider>
  );
}
