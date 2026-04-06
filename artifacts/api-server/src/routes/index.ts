import { Router, type IRouter } from "express";
import healthRouter from "./health";
import detectRouter from "./detect";
import sessionsRouter from "./sessions";
import alertsRouter from "./alerts";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use(detectRouter);
router.use(sessionsRouter);
router.use(alertsRouter);
router.use(statsRouter);

export default router;
