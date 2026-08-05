import { Router } from "express";

import {
  verifyToken,
  requireUser
} from "../middleware/auth.middleware.js";

import {
  getActivities,
  getActivityById,
  saveActivityResponse,
  getUserActivities
} from "../controllers/activity.controller.js";

const router = Router();

router.use(
  verifyToken,
  requireUser
);

router.get("/", getActivities);
router.get("/completed", getUserActivities);
router.get("/:id", getActivityById);
router.post(
  "/:id/responses",
  saveActivityResponse
);

export default router;