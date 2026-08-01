import { Router } from "express";

import {
  verifyToken,
  requireUser
} from "../middleware/auth.middleware.js";

import {
  createEmotion,
  getEmotions,
  getEmotionHistory,
  getEmotionStats,
  deleteEmotion
} from "../controllers/emotion.controller.js";

const router = Router();

router.use(
  verifyToken,
  requireUser
);

router.post("/", createEmotion);
router.get("/", getEmotions);
router.get("/history", getEmotionHistory);
router.get("/stats", getEmotionStats);
router.delete("/:id", deleteEmotion);

export default router;