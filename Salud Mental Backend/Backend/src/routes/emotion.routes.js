import { Router } from "express";
import { verifyToken } from "../middleware/auth.middleware.js";

import {
  createEmotion,
  getEmotions,
  getEmotionHistory,
  getEmotionStats,
  deleteEmotion
} from "../controllers/emotion.controller.js";

const router = Router();

router.post("/", verifyToken, createEmotion);
router.get("/", verifyToken, getEmotions);
router.get("/history", verifyToken, getEmotionHistory);
router.get("/stats", verifyToken, getEmotionStats);
router.delete("/:id", verifyToken, deleteEmotion);

export default router;