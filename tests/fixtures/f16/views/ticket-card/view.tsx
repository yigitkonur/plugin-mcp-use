import "./view.css";
import { useCallTool, useToolContext, useViewTheme } from "mcp-use/react";

export default function TicketCard() {
  const context = useToolContext<"show-ticket">();
  const theme = useViewTheme();
  const refresh = useCallTool("refresh-ticket");

  if (context.status === "pending") {
    return <div className="ticket" data-status="pending">Loading…</div>;
  }
  if (context.status === "error") {
    return <div className="ticket" data-status="error">{context.error.message}</div>;
  }
  const { id, subject, status, assignee } = context.toolOutput;
  const latest = refresh.data?.structuredContent?.status ?? status;
  return (
    <div className="ticket" data-theme={theme} data-status="ready">
      <h2>{subject}</h2>
      <p className="meta">{id} · assigned to {assignee}</p>
      <span className="status" data-status={latest}>{latest}</span>
      <button type="button" onClick={() => refresh.callTool({ id })} disabled={refresh.isPending}>
        {refresh.isPending ? "Checking…" : "Refresh status"}
      </button>
    </div>
  );
}
