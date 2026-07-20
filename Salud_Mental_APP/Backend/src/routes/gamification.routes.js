import { Router } from "express";

import {
  verifyToken
} from "../middleware/auth.middleware.js";

import {
  getProgress,
  getAchievements,
  rejectManualProgressUpdate
} from "../controllers/gamification.controller.js";

const router = Router();

/*
 * GET /api/gamification/progress
 * Consulta puntos, nivel, racha y actividades.
 */
router.get(
  "/progress",
  verifyToken,
  getProgress
);

/*
 * PATCH /api/gamification/progress
 * Bloquea modificaciones manuales.
 */
router.patch(
  "/progress",
  verifyToken,
  rejectManualProgressUpdate
);

/*
 * GET /api/gamification/achievements
 * Consulta el catálogo de logros.
 */
router.get(
  "/achievements",
  verifyToken,
  getAchievements
);

export default router;