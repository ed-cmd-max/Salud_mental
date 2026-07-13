import { Router } from "express";
import { verifyToken } from "../middleware/auth.middleware.js";

import { getActivities, getActivityById, saveActivityResponse, getUserActivities } from "../controllers/activity.controller.js";

const router = Router();

router.get("/", verifyToken, getActivities);
router.get("/completed", verifyToken, getUserActivities);
router.get("/:id", verifyToken, getActivityById);
router.post("/:id/responses", verifyToken, saveActivityResponse);

export default router;