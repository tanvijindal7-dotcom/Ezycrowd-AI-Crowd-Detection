/**
 * Detection session history routes.
 * GET /sessions        — list all sessions
 * GET /sessions/:id    — get a specific session
 */

import { Router, type IRouter } from "express";
import {
  ListSessionsQueryParams,
  ListSessionsResponse,
  GetSessionParams,
  GetSessionResponse,
} from "@workspace/api-zod";
import { sessions } from "./detect";

const router: IRouter = Router();

/** GET /sessions — list sessions, newest first */
router.get("/sessions", async (req, res): Promise<void> => {
  const parsed = ListSessionsQueryParams.safeParse(req.query);
  const limit = parsed.success ? (parsed.data.limit ?? 20) : 20;
  const alertOnly = parsed.success ? (parsed.data.alert_only ?? false) : false;

  let all = Array.from(sessions.values());
  if (alertOnly) all = all.filter((s) => s.alertTriggered);
  all.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const sliced = all.slice(0, limit);

  res.json(
    ListSessionsResponse.parse({
      sessions: sliced.map((s) => ({
        ...s,
        createdAt: s.createdAt.toISOString(),
      })),
      total: all.length,
    }),
  );
});

/** GET /sessions/:sessionId — get one session */
router.get("/sessions/:sessionId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.sessionId)
    ? req.params.sessionId[0]
    : req.params.sessionId;

  const parsed = GetSessionParams.safeParse({ sessionId: raw });
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const session = sessions.get(parsed.data.sessionId);
  if (!session) {
    res.status(404).json({ error: `Session '${parsed.data.sessionId}' not found.` });
    return;
  }

  res.json(
    GetSessionResponse.parse({
      ...session,
      createdAt: session.createdAt.toISOString(),
    }),
  );
});

export default router;
