/**
 * Statistics summary route.
 * GET /stats/summary — aggregate crowd detection metrics
 */

import { Router, type IRouter } from "express";
import { GetStatsSummaryResponse } from "@workspace/api-zod";
import { sessions } from "./detect";

const router: IRouter = Router();

router.get("/stats/summary", async (_req, res): Promise<void> => {
  const all = Array.from(sessions.values());
  const total = all.length;

  if (total === 0) {
    res.json(
      GetStatsSummaryResponse.parse({
        totalSessions: 0,
        totalAlerts: 0,
        averagePeopleCount: 0,
        maxPeopleCount: 0,
        alertRate: 0,
        recentSessions: [],
      }),
    );
    return;
  }

  const alertSessions = all.filter((s) => s.alertTriggered);
  const counts = all.map((s) => s.peopleCount);
  const avgCount = counts.reduce((a, b) => a + b, 0) / total;
  const maxCount = Math.max(...counts);

  const recent = all
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5)
    .map((s) => ({ ...s, createdAt: s.createdAt.toISOString() }));

  res.json(
    GetStatsSummaryResponse.parse({
      totalSessions: total,
      totalAlerts: alertSessions.length,
      averagePeopleCount: parseFloat(avgCount.toFixed(2)),
      maxPeopleCount: maxCount,
      alertRate: parseFloat((alertSessions.length / total).toFixed(4)),
      recentSessions: recent,
    }),
  );
});

export default router;
