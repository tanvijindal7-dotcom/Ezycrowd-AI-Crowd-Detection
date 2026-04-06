/**
 * Dashboard — main command center for Ezycrowd.
 * Features: stats summary, file upload detection, live webcam mode, recent activity.
 */
import { useCallback, useRef, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetStatsSummary,
  getGetStatsSummaryQueryKey,
  useDetectCrowd,
  useListAlerts,
  getListAlertsQueryKey,
  getListSessionsQueryKey,
} from "@workspace/api-client-react";
import type { DetectCrowdResponse200 } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

// ── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: "green" | "red" | "blue" | "yellow";
}) {
  const colors = {
    green: "text-emerald-400",
    red: "text-red-400",
    blue: "text-sky-400",
    yellow: "text-amber-400",
  };
  return (
    <div className="bg-card border border-card-border rounded-lg p-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">{label}</p>
      <p className={cn("text-3xl font-bold tabular-nums", accent ? colors[accent] : "text-foreground")}>
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

// ── Detection Result Panel ───────────────────────────────────────────────────

function DetectionResultPanel({ result }: { result: DetectCrowdResponse200 }) {
  const isAlert = result.alertTriggered;
  return (
    <div
      className={cn(
        "rounded-lg border p-5 transition-all duration-300",
        isAlert
          ? "bg-red-950/40 border-red-500 alert-pulse"
          : "bg-emerald-950/30 border-emerald-600/50",
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs uppercase tracking-widest font-semibold text-muted-foreground mb-1">
            Detection Result
          </p>
          {isAlert && (
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-bold text-red-400 uppercase tracking-wider">
                ALERT — Threshold Exceeded
              </span>
            </div>
          )}
        </div>
        <span
          className={cn(
            "px-2 py-1 rounded text-xs font-mono font-bold",
            isAlert ? "bg-red-500/20 text-red-300" : "bg-emerald-500/20 text-emerald-300",
          )}
        >
          {isAlert ? "ALERT" : "CLEAR"}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">People Detected</p>
          <p className={cn("text-4xl font-bold tabular-nums", isAlert ? "text-red-400" : "text-emerald-400")}>
            {result.peopleCount}
          </p>
          <p className="text-xs text-muted-foreground">threshold: {result.threshold}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Confidence</p>
          <p className="text-2xl font-bold tabular-nums text-sky-400">
            {(result.confidence * 100).toFixed(1)}%
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Processing Time</p>
          <p className="text-2xl font-bold tabular-nums text-amber-400">
            {result.processingTimeMs.toFixed(0)}ms
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Session ID</p>
          <p className="text-xs font-mono text-muted-foreground truncate">{result.sessionId}</p>
        </div>
      </div>
    </div>
  );
}

// ── Upload Panel ─────────────────────────────────────────────────────────────

function UploadPanel({
  onResult,
}: {
  onResult: (r: DetectCrowdResponse200) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [mode, setMode] = useState<"upload" | "webcam">("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [webcamActive, setWebcamActive] = useState(false);
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [liveAlert, setLiveAlert] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { mutate: detect, isPending } = useDetectCrowd();

  const handleFile = useCallback(
    (file: File) => {
      setSelectedFile(file);
      const formData = new FormData();
      formData.append("file", file);
      detect(
        { data: formData as any },
        {
          onSuccess: (result) => onResult(result),
        },
      );
    },
    [detect, onResult],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const startWebcam = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setWebcamActive(true);

      // Capture frame every 3 seconds and send to detect
      intervalRef.current = setInterval(() => {
        if (!videoRef.current || !canvasRef.current) return;
        const canvas = canvasRef.current;
        canvas.width = videoRef.current.videoWidth || 640;
        canvas.height = videoRef.current.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (!blob) return;
          const formData = new FormData();
          formData.append("file", blob, "webcam-frame.jpg");
          detect(
            { data: formData as any },
            {
              onSuccess: (result) => {
                setLiveCount(result.peopleCount);
                setLiveAlert(result.alertTriggered);
                onResult(result);
              },
            },
          );
        }, "image/jpeg", 0.85);
      }, 3000);
    } catch (err) {
      alert("Could not access webcam. Please allow camera permission.");
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setWebcamActive(false);
    setLiveCount(null);
    setLiveAlert(false);
  };

  useEffect(() => () => stopWebcam(), []);

  return (
    <div className="bg-card border border-card-border rounded-lg p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Detection Input
        </h2>
        <div className="flex gap-1">
          {(["upload", "webcam"] as const).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                if (m !== "webcam") stopWebcam();
              }}
              className={cn(
                "px-3 py-1.5 rounded text-xs font-semibold uppercase tracking-wider transition-colors",
                mode === m
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground",
              )}
            >
              {m === "upload" ? "Upload File" : "Live Webcam"}
            </button>
          ))}
        </div>
      </div>

      {mode === "upload" ? (
        <div>
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors",
              isDragging
                ? "border-primary bg-primary/10"
                : "border-border hover:border-primary/60 hover:bg-accent/30",
            )}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-10 h-10 mx-auto mb-3 text-muted-foreground">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <p className="text-sm font-medium text-foreground">
              {selectedFile ? selectedFile.name : "Drop file here or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Supports JPG, PNG, WebP, MP4, AVI, MOV
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          {isPending && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Running YOLOv8 detection...
            </div>
          )}
        </div>
      ) : (
        <div>
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
            <canvas ref={canvasRef} className="hidden" />
            {!webcamActive && (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-10 h-10 mx-auto mb-2 opacity-40">
                    <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  <p className="text-sm opacity-40">Camera inactive</p>
                </div>
              </div>
            )}
            {webcamActive && liveCount !== null && (
              <div className={cn(
                "absolute top-3 right-3 px-3 py-2 rounded-lg text-sm font-bold font-mono",
                liveAlert ? "bg-red-600/90 text-white" : "bg-emerald-600/90 text-white",
              )}>
                {liveCount} people {liveAlert ? "— ALERT" : ""}
              </div>
            )}
            {webcamActive && (
              <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/60 px-2 py-1 rounded text-xs text-red-400">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                LIVE
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-3">
            {!webcamActive ? (
              <button
                onClick={startWebcam}
                className="flex-1 bg-primary text-primary-foreground py-2 rounded text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Start Live Detection
              </button>
            ) : (
              <button
                onClick={stopWebcam}
                className="flex-1 bg-destructive text-destructive-foreground py-2 rounded text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                Stop Camera
              </button>
            )}
          </div>
          {webcamActive && (
            <p className="text-xs text-muted-foreground text-center mt-2">
              Capturing frame every 3 seconds for detection
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Recent Alert Feed ─────────────────────────────────────────────────────────

function AlertFeed() {
  const { data, isLoading } = useListAlerts(
    { limit: 8 },
    { query: { queryKey: getListAlertsQueryKey({ limit: 8 }), refetchInterval: 15000 } },
  );

  return (
    <div className="bg-card border border-card-border rounded-lg p-5">
      <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">
        Recent Alerts
      </h2>
      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 rounded bg-muted animate-pulse" />
          ))}
        </div>
      )}
      {!isLoading && (!data?.alerts || data.alerts.length === 0) && (
        <div className="text-center py-8 text-muted-foreground">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 mx-auto mb-2 opacity-30">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
          <p className="text-sm">No alerts triggered yet</p>
        </div>
      )}
      <div className="space-y-2">
        {data?.alerts.map((alert) => (
          <div key={alert.id} className="flex items-center justify-between p-3 bg-red-950/20 border border-red-900/40 rounded-md">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  {alert.peopleCount} people detected
                </p>
                <p className="text-xs text-muted-foreground">
                  Threshold: {alert.threshold}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(alert.createdAt).toLocaleTimeString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Dashboard Page ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [lastResult, setLastResult] = useState<DetectCrowdResponse200 | null>(null);

  const { data: stats, isLoading: statsLoading } = useGetStatsSummary({
    query: {
      queryKey: getGetStatsSummaryQueryKey(),
      refetchInterval: 30000,
    },
  });

  const handleDetectionResult = useCallback(
    (result: DetectCrowdResponse200) => {
      setLastResult(result);
      queryClient.invalidateQueries({ queryKey: getGetStatsSummaryQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListSessionsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListAlertsQueryKey() });
    },
    [queryClient],
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Command Center</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          AI-powered crowd detection and management
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg bg-card border border-card-border animate-pulse" />
          ))
        ) : (
          <>
            <StatCard
              label="Total Sessions"
              value={stats?.totalSessions ?? 0}
              accent="blue"
            />
            <StatCard
              label="Total Alerts"
              value={stats?.totalAlerts ?? 0}
              accent="red"
            />
            <StatCard
              label="Avg People"
              value={stats?.averagePeopleCount.toFixed(1) ?? "—"}
              accent="yellow"
            />
            <StatCard
              label="Alert Rate"
              value={stats ? `${(stats.alertRate * 100).toFixed(1)}%` : "—"}
              sub={`Peak: ${stats?.maxPeopleCount ?? 0} people`}
              accent={stats && stats.alertRate > 0.5 ? "red" : "green"}
            />
          </>
        )}
      </div>

      {/* Main grid: upload + alert feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <UploadPanel onResult={handleDetectionResult} />
          {lastResult && <DetectionResultPanel result={lastResult} />}
        </div>
        <AlertFeed />
      </div>
    </div>
  );
}
