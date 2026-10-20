import "./view.css";
import { useEffect } from "react";
import { useToolContext, useViewTheme } from "mcp-use/react";
import { AppsSDKUIProvider } from "@openai/apps-sdk-ui/components/AppsSDKUIProvider";
import { Badge } from "@openai/apps-sdk-ui/components/Badge";
import { applyDocumentTheme } from "@openai/apps-sdk-ui/theme";

export default function ProductCard() {
  const context = useToolContext<"show-product">();
  const theme = useViewTheme();

  useEffect(() => {
    applyDocumentTheme(theme);
  }, [theme]);

  if (context.status === "pending") {
    return <div className="p-4 text-secondary" data-status="pending">Loading…</div>;
  }
  if (context.status === "error") {
    return <div className="p-4 text-danger" data-status="error">{context.error.message}</div>;
  }
  const { title, sku, price, inStock } = context.toolOutput;
  return (
    <AppsSDKUIProvider linkComponent="a">
      <div className="p-4" data-status="ready">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="heading-md">{title}</h2>
            <p className="text-secondary text-sm">SKU: {sku}</p>
          </div>
          <Badge color={inStock ? "success" : "warning"}>{inStock ? "In stock" : "Backorder"}</Badge>
        </div>
        <p className="mt-3 text-lg font-semibold">${price.toFixed(2)}</p>
      </div>
    </AppsSDKUIProvider>
  );
}
