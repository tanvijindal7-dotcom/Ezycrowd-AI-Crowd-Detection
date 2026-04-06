/**
 * Settings page — configure the alert threshold and view system info.
 */
import { useState, useEffect } from "react";
import {
  useGetThreshold,
  getGetThresholdQueryKey,
  useUpdateThreshold,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export default function Settings() {
  const queryClient = useQueryClient();
  const [inputVal, setInputVal] = useState<string>("");
  const [saved, setSaved] = useState(false);

  const { data: thresholdData, isLoading } = useGetThreshold({
    query: { queryKey: getGetThresholdQueryKey() },
  });

  const { mutate: updateThreshold, isPending } = useUpdateThreshold();

  useEffect(() => {
    if (thresholdData?.threshold !== undefined) {
      setInputVal(String(thresholdData.threshold));
    }
  }, [thresholdData?.threshold]);

  const handleSave = () => {
    const val = parseInt(inputVal, 10);
    if (isNaN(val) || val < 1) return;
    updateThreshold(
      { data: { threshold: val } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetThresholdQueryKey() });
          setSaved(true);
          setTimeout(() => setSaved(false), 2500);
        },
      },
    );
  };

  const presets = [5, 10, 15, 25, 50, 100];

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure detection parameters and system behavior
        </p>
      </div>

      {/* Threshold config */}
      <div className="bg-card border border-card-border rounded-lg p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-foreground">Alert Threshold</h2>
          <p className="text-sm text-muted-foreground mt-1">
            When detected people count reaches or exceeds this value, an alert is triggered and logged.
          </p>
        </div>

        {/* Current value display */}
        <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Current Threshold</p>
            {isLoading ? (
              <div className="h-8 w-16 rounded bg-muted animate-pulse" />
            ) : (
              <p className="text-3xl font-bold tabular-nums text-primary">
                {thresholdData?.threshold ?? "—"}
              </p>
            )}
          </div>
          <div className="text-muted-foreground text-sm">people</div>
        </div>

        {/* Quick presets */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Quick Presets</p>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={p}
                onClick={() => setInputVal(String(p))}
                className={cn(
                  "px-3 py-1.5 rounded text-sm font-semibold transition-colors",
                  inputVal === String(p)
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:opacity-80",
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Custom input */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Custom Value</p>
          <div className="flex gap-3">
            <input
              type="number"
              min={1}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="w-32 px-3 py-2 rounded-md bg-input border border-border text-foreground text-sm font-mono tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="10"
            />
            <button
              onClick={handleSave}
              disabled={isPending || inputVal === String(thresholdData?.threshold)}
              className={cn(
                "px-4 py-2 rounded-md text-sm font-semibold transition-all",
                saved
                  ? "bg-emerald-600 text-white"
                  : "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed",
              )}
            >
              {isPending ? "Saving..." : saved ? "Saved!" : "Save Threshold"}
            </button>
          </div>
          {parseInt(inputVal, 10) < 1 && inputVal !== "" && (
            <p className="text-xs text-destructive mt-1.5">Threshold must be at least 1</p>
          )}
        </div>
      </div>

      {/* System info */}
      <div className="bg-card border border-card-border rounded-lg p-6 space-y-4">
        <h2 className="text-base font-semibold text-foreground">System Information</h2>
        <div className="space-y-3">
          {[
            { label: "Detection Engine", value: "YOLOv8 Nano (COCO pretrained)" },
            { label: "Supported Inputs", value: "JPEG, PNG, WebP, BMP, MP4, AVI, MOV, WebM" },
            { label: "Storage", value: "In-memory (replace with DB for production)" },
            { label: "CORS", value: "Enabled — configure ALLOWED_ORIGINS for production" },
            { label: "API Version", value: "v1.0.0" },
          ].map((item) => (
            <div key={item.label} className="flex justify-between items-start py-2 border-b border-border last:border-0">
              <p className="text-sm text-muted-foreground">{item.label}</p>
              <p className="text-sm text-foreground font-mono text-right max-w-64">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Python backend info */}
      <div className="bg-card border border-card-border rounded-lg p-6 space-y-3">
        <h2 className="text-base font-semibold text-foreground">Production AI Backend</h2>
        <p className="text-sm text-muted-foreground">
          For production-grade AI inference with real YOLOv8 + OpenCV, deploy the Python FastAPI service
          included in the <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">ezycrowd-python/</code> directory.
        </p>
        <div className="bg-muted/30 rounded-md p-3 font-mono text-xs text-muted-foreground">
          <p>pip install -r requirements.txt</p>
          <p className="mt-1">python run.py</p>
        </div>
      </div>
    </div>
  );
}
