/**
 * Alert history route.
 * GET /alerts — list all triggered alerts, newest first
 */

import { Router, type IRouter } from "express";
import { ListAlertsQueryParams, ListAlertsResponse } from "@workspace/api-zod";
import { alerts } from "./detect";

const router: IRouter = Router();

router.get("/alerts", async (req, res): Promise<void> => {
  const parsed = ListAlertsQueryParams.safeParse(req.query);
  const limit = parsed.success ? (parsed.data.limit ?? 20) : 20;

  const all = Array.from(alerts.values()).sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );

  res.json(
    ListAlertsResponse.parse({
      alerts: all.slice(0, limit).map((a) => ({
        ...a,
        createdAt: a.createdAt.toISOString(),
      })),
      total: all.length,
    }),
  );
});

export default router;
