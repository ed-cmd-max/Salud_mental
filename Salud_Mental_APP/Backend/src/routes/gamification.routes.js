import { Router } from "express";

import { verifyToken } from "../middleware/auth.middleware.js";

import { getProgress, getAchievements, rejectManualProgressUpdate } from "../controllers/gamification.controller.js";

const router = Router();

router.get(
  "/progress",
  verifyToken,
  getProgress
);

router.patch(
  "/progress",
  verifyToken,
  rejectManualProgressUpdate
);

router.get(
  "/achievements",
  verifyToken,
  getAchievements
);

export default router;