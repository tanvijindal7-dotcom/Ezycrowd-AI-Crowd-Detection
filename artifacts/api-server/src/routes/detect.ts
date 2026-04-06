/**
 * Crowd detection routes.
 * POST /detect           — upload image/video, run (simulated) YOLOv8 detection
 * GET  /detect/threshold — get current alert threshold
 * PUT  /detect/threshold — update alert threshold
 *
 * In this Node.js environment, detection is handled by a realistic simulation.
 * For production AI inference, deploy the ezycrowd-python FastAPI service and
 * proxy these calls to it.
 */

import { Router, type IRouter } from "express";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import {
  DetectCrowdBody,
  DetectCrowdResponse,
  GetThresholdResponse,
  UpdateThresholdBody,
  UpdateThresholdResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// Store uploaded files in memory (max 50 MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

// ── In-memory state ─────────────────────────────────────────────────────────

/** Sessions stored in memory. Replace with DB in production. */
interface SessionRecord {
  id: string;
  peopleCount: number;
  alertTriggered: boolean;
  threshold: number;
  confidence: number;
  processingTimeMs: number;
  createdAt: Date;
  fileName?: string;
}

interface AlertRecord {
  id: string;
  sessionId: string;
  peopleCount: number;
  threshold: number;
  createdAt: Date;
}

export const sessions: Map<string, SessionRecord> = new Map();
export const alerts: Map<string, AlertRecord> = new Map();

/** Current alert threshold — configurable via PUT /detect/threshold */
export let currentThreshold = 10;

// ── Supported file extensions ────────────────────────────────────────────────

const SUPPORTED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/bmp",
  "image/tiff",
  "video/mp4",
  "video/avi",
  "video/quicktime",
  "video/webm",
  "video/x-matroska",
]);

// ── Simulated YOLO detection ─────────────────────────────────────────────────

/**
 * Simulate YOLO detection with realistic randomization.
 * In production, call the Python FastAPI service here.
 */
function simulateDetection(
  fileBuffer: Buffer,
  mimetype: string,
): {
  peopleCount: number;
  confidence: number;
  processingTimeMs: number;
  detections: Array<{ x: number; y: number; width: number; height: number; confidence: number }>;
} {
  const start = Date.now();

  // Use file size as a seed proxy for reproducible but varied results
  const sizeSeed = fileBuffer.length % 1000;
  const baseCount = Math.floor((sizeSeed / 1000) * 18);
  const jitter = Math.floor(Math.random() * 6) - 2;
  const peopleCount = Math.max(0, baseCount + jitter);

  const detections = Array.from({ length: peopleCount }, () => {
    const conf = 0.45 + Math.random() * 0.50; // 0.45–0.95
    return {
      x: Math.random() * 0.85,
      y: Math.random() * 0.85,
      width: 0.04 + Math.random() * 0.08,
      height: 0.12 + Math.random() * 0.18,
      confidence: parseFloat(conf.toFixed(3)),
    };
  });

  const avgConf =
    detections.length > 0
      ? detections.reduce((s, d) => s + d.confidence, 0) / detections.length
      : 0;

  // Simulate processing time: images ~50-200ms, videos ~200-800ms
  const isVideo = mimetype.startsWith("video/");
  const baseMs = isVideo ? 300 : 80;
  const processingTimeMs = baseMs + Math.random() * (isVideo ? 400 : 100);

  // Artificially delay to simulate real inference
  const elapsed = Date.now() - start;
  return {
    peopleCount,
    confidence: parseFloat(avgConf.toFixed(3)),
    processingTimeMs: parseFloat(processingTimeMs.toFixed(1)),
    detections,
  };
}

// ── Routes ───────────────────────────────────────────────────────────────────

/** POST /detect — upload file and run crowd detection */
router.post("/detect", upload.single("file"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded. Provide a file via multipart/form-data." });
    return;
  }

  const { mimetype, originalname, buffer } = req.file;

  if (!SUPPORTED_TYPES.has(mimetype)) {
    res.status(400).json({
      error: `Unsupported file type '${mimetype}'.`,
      details: "Supported: JPEG, PNG, WebP, BMP, TIFF, MP4, AVI, MOV, WebM, MKV",
    });
    return;
  }

  // Parse optional per-request threshold override
  const thresholdRaw = req.body?.threshold;
  const activeThreshold =
    thresholdRaw !== undefined ? parseInt(String(thresholdRaw), 10) : currentThreshold;

  req.log.info({ fileName: originalname, size: buffer.length, threshold: activeThreshold }, "Processing detection");

  const { peopleCount, confidence, processingTimeMs, detections } = simulateDetection(buffer, mimetype);

  const alertTriggered = peopleCount >= activeThreshold;
  const sessionId = uuidv4();
  const now = new Date();

  // Persist session
  const session: SessionRecord = {
    id: sessionId,
    peopleCount,
    alertTriggered,
    threshold: activeThreshold,
    confidence,
    processingTimeMs,
    createdAt: now,
    fileName: originalname,
  };
  sessions.set(sessionId, session);

  // Persist alert if triggered
  if (alertTriggered) {
    const alertId = uuidv4();
    alerts.set(alertId, {
      id: alertId,
      sessionId,
      peopleCount,
      threshold: activeThreshold,
      createdAt: now,
    });
    req.log.warn({ sessionId, peopleCount, threshold: activeThreshold }, "Crowd alert triggered");
  }

  const result = DetectCrowdResponse.parse({
    sessionId,
    peopleCount,
    alertTriggered,
    threshold: activeThreshold,
    confidence,
    processingTimeMs,
    timestamp: now.toISOString(),
    imageUrl: undefined,
    detections,
  });

  res.json(result);
});

/** GET /detect/threshold — return current threshold */
router.get("/detect/threshold", (_req, res): void => {
  res.json(GetThresholdResponse.parse({ threshold: currentThreshold }));
});

/** PUT /detect/threshold — update threshold */
router.put("/detect/threshold", async (req, res): Promise<void> => {
  const parsed = UpdateThresholdBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  currentThreshold = parsed.data.threshold;
  req.log.info({ threshold: currentThreshold }, "Alert threshold updated");

  res.json(UpdateThresholdResponse.parse({ threshold: currentThreshold }));
});

export default router;
