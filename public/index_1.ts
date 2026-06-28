import { Router, type IRouter } from "express";
import healthRouter from "./health";
import labRouter from "./lab";
import brainRouter from "./brain";

const router: IRouter = Router();

router.use(healthRouter);
router.use(labRouter);
router.use(brainRouter);

export default router;
