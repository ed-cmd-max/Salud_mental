import { Router } from "express";

import {
  verifyToken,
  requireUser
} from "../middleware/auth.middleware.js";

import {
  getProgress,
  getAchievements,
  rejectManualProgressUpdate
} from "../controllers/gamification.controller.js";

const router = Router();

router.use(
  verifyToken,
  requireUser
);

router.get(
  "/progress",
  getProgress
);

router.patch(
  "/progress",
  rejectManualProgressUpdate
);

router.get(
  "/achievements",
  getAchievements
);

export default router;