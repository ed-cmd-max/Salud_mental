import { Router } from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import {
  getActivities,
  getActivityById,
  completeActivity,
  getUserActivities
} from "../controllers/activity.controller.js";

const router = Router();

router.get("/", verifyToken, getActivities);
router.get("/completed", verifyToken, getUserActivities);
router.get("/:id", verifyToken, getActivityById);
router.post("/:id/complete", verifyToken, completeActivity);

export default router;