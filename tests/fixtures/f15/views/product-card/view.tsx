import "./view.css";
import { useState } from "react";
import { useToolContext, useViewTheme, useModelContext } from "mcp-use/react";
import { Card } from "@openai/apps-sdk-ui/components/Card";
import { Button } from "@openai/apps-sdk-ui/components/Button";
import { AppsSDKUIProvider } from "@openai/apps-sdk-ui/components/AppsSDKUIProvider";

export const viewConfig = { autoResize: true, displayModes: ["inline", "fullscreen", "pip"] };

export default function ProductCard() {
  // CG-U03: toolOutput destructured without status
  const { toolOutput } = useToolContext<"show-product">();
  // CG-U04: useViewTheme returns a string
  const { theme } = useViewTheme();
  const { attachments } = useModelContext();
  // CG-U05: attachments is an array, not a Record
  const entries = Object.entries(attachments);
  const [tab, setTab] = useState(0);

  // CG-U09: browser storage
  localStorage.setItem("last", String(tab));
  // CG-U13: window.openai without feature detection
  const call = () => window.openai.callTool("show-product", { sku: "x" });
  // CG-X03: ?route= deep link
  const link = "https://chatgpt.com/plugins/p/app/show-product?route=/item/1";

  return (
    // CG-U02: provider without linkComponent
    <AppsSDKUIProvider>
      <Card>
        <div className="card overflow-y-auto" data-theme={theme} data-n={entries.length}>
          {/* CG-U12: tabs */}
          <div role="tablist"><button role="tab" onClick={() => setTab(1)}>One</button></div>
          {/* CG-U14: img without alt */}
          <img src="/p.png" />
          {/* CG-U16: iframe */}
          <iframe src="https://example.com/embed" />
          {/* CG-A04: password input */}
          <input type="password" />
          {/* CG-U11: three actions */}
          <Button color="primary" onClick={call}>Buy</Button>
          <Button color="secondary">Save</Button>
          <Button color="secondary">Share</Button>
          <a href={link}>{toolOutput?.title}</a>
        </div>
      </Card>
    </AppsSDKUIProvider>
  );
}
