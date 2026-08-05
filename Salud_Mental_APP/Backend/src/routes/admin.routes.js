import { Router } from "express";

import {
  verifyToken,
  requireAdmin
} from "../middleware/auth.middleware.js";

import {
  getUsers,
  updateUserStatus,
  updateUserRole,

  getAdminActivities,
  createAdminActivity,
  updateAdminActivity,
  updateActivityStatus,

  getAdminAchievements,
  createAdminAchievement,
  updateAdminAchievement,
  updateAchievementStatus
} from "../controllers/admin.controller.js";
  


const router = Router();

router.use(
  verifyToken,
  requireAdmin
);

/* Usuarios */

router.get(
  "/users",
  getUsers
);

router.patch(
  "/users/:id/status",
  updateUserStatus
);

router.patch(
  "/users/:id/role",
  updateUserRole
);

/* Actividades terapéuticas */

router.get(
  "/activities",
  getAdminActivities
);

router.post(
  "/activities",
  createAdminActivity
);

router.put(
  "/activities/:id",
  updateAdminActivity
);

router.patch(
  "/activities/:id/status",
  updateActivityStatus
);

/* Logros de gamificación */

router.get(
  "/achievements",
  getAdminAchievements
);

router.post(
  "/achievements",
  createAdminAchievement
);

router.put(
  "/achievements/:id",
  updateAdminAchievement
);

router.patch(
  "/achievements/:id/status",
  updateAchievementStatus
);
export default router;