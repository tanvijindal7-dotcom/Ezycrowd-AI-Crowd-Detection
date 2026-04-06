/**
 * Sessions page — full history of detection sessions with filtering.
 */
import { useState } from "react";
import { useListSessions, getListSessionsQueryKey } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

export default function Sessions() {
  const [alertOnly, setAlertOnly] = useState(false);
  const [limit, setLimit] = useState(50);

  const { data, isLoading, refetch } = useListSessions(
    { limit, alert_only: alertOnly },
    { query: { queryKey: getListSessionsQueryKey({ limit, alert_only: alertOnly }), refetchInterval: 20000 } },
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Detection Sessions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Full history of crowd detection runs
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={alertOnly}
              onChange={(e) => setAlertOnly(e.target.checked)}
              className="rounded border-border bg-input text-primary"
            />
            Alerts only
          </label>
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded text-xs font-semibold hover:opacity-80 transition-opacity"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Total count */}
      {!isLoading && data && (
        <p className="text-sm text-muted-foreground">
          Showing {data.sessions.length} of {data.total} sessions
        </p>
      )}

      {/* Table */}
      <div className="bg-card border border-card-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-xs">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-xs">People</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-xs">Threshold</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-xs">Confidence</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-xs">Time (ms)</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-xs">File</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground uppercase tracking-wider text-xs">Date</th>
              </tr>
            </thead>
            <tbody>
              {isLoading &&
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 rounded bg-muted animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))}
              {!isLoading && data?.sessions.map((session) => (
                <tr
                  key={session.id}
                  className={cn(
                    "border-b border-border transition-colors hover:bg-accent/30",
                    session.alertTriggered && "bg-red-950/20",
                  )}
                >
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded text-xs font-bold",
                        session.alertTriggered
                          ? "bg-red-500/20 text-red-400"
                          : "bg-emerald-500/20 text-emerald-400",
                      )}
                    >
                      {session.alertTriggered ? "ALERT" : "CLEAR"}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold tabular-nums text-foreground">
                    {session.peopleCount}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">
                    {session.threshold}
                  </td>
                  <td className="px-4 py-3 text-sky-400 font-mono tabular-nums">
                    {(session.confidence * 100).toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-amber-400 font-mono tabular-nums">
                    {session.processingTimeMs.toFixed(0)}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs truncate max-w-32">
                    {session.fileName ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs font-mono">
                    {new Date(session.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!isLoading && (!data?.sessions || data.sessions.length === 0) && (
          <div className="text-center py-16 text-muted-foreground">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-10 h-10 mx-auto mb-3 opacity-30">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h7.5M8.25 12h7.5m-7.5 5.25h7.5M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            <p className="text-sm">
              {alertOnly ? "No alert sessions found" : "No sessions yet — upload an image to start"}
            </p>
          </div>
        )}
      </div>

      {/* Load more */}
      {data && data.total > limit && (
        <div className="text-center">
          <button
            onClick={() => setLimit((l) => l + 50)}
            className="px-4 py-2 bg-secondary text-secondary-foreground rounded text-sm font-medium hover:opacity-80 transition-opacity"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
