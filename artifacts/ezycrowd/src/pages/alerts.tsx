/**
 * Alerts page — dedicated view of all triggered crowd alerts.
 */
import { useListAlerts, getListAlertsQueryKey } from "@workspace/api-client-react";

export default function Alerts() {
  const { data, isLoading, refetch } = useListAlerts(
    { limit: 100 },
    { query: { queryKey: getListAlertsQueryKey({ limit: 100 }), refetchInterval: 15000 } },
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Alert Log</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            All crowd threshold breaches recorded by the system
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded text-xs font-semibold hover:opacity-80 transition-opacity"
        >
          Refresh
        </button>
      </div>

      {/* Alert count banner */}
      {!isLoading && data && data.total > 0 && (
        <div className="flex items-center gap-3 p-4 bg-red-950/30 border border-red-800/50 rounded-lg">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
          <p className="text-sm font-medium text-red-300">
            {data.total} alert{data.total !== 1 ? "s" : ""} recorded —{" "}
            {data.alerts.filter((a) => {
              const d = new Date(a.createdAt);
              const now = new Date();
              return now.getTime() - d.getTime() < 3600 * 1000;
            }).length}{" "}
            in the last hour
          </p>
        </div>
      )}

      {/* Alert cards */}
      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-card border border-card-border animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && (!data?.alerts || data.alerts.length === 0) && (
        <div className="text-center py-20 text-muted-foreground">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-12 h-12 mx-auto mb-4 opacity-30">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-base font-medium">No alerts triggered</p>
          <p className="text-sm mt-1">The crowd has remained below threshold on all detections.</p>
        </div>
      )}

      <div className="space-y-3">
        {data?.alerts.map((alert, index) => (
          <div
            key={alert.id}
            className="flex items-center gap-4 p-4 bg-card border border-red-900/40 rounded-lg hover:border-red-700/60 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-red-400">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-red-400 tabular-nums">{alert.peopleCount} people detected</p>
                <span className="text-xs text-muted-foreground font-mono">threshold: {alert.threshold}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate">
                Session: {alert.sessionId}
              </p>
            </div>

            <div className="text-right flex-shrink-0">
              <p className="text-xs text-muted-foreground font-mono">
                {new Date(alert.createdAt).toLocaleDateString()}
              </p>
              <p className="text-xs text-muted-foreground font-mono">
                {new Date(alert.createdAt).toLocaleTimeString()}
              </p>
            </div>

            <div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0 text-xs text-red-400 font-mono font-bold">
              {index + 1}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
