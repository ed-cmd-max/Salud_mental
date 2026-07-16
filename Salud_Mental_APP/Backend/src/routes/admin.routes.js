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
  updateActivityStatus
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

export default router;