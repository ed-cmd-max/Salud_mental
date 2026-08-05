import { api } from "./api";

/* =====================================================
 * USUARIOS
 * ===================================================== */

export type UserRole =
  | "user"
  | "admin";

export type AccountStatus =
  | "active"
  | "inactive";

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  account_status: AccountStatus;
  created_at: string;
}

interface AdminUsersResponse {
  message: string;
  total: number;
  users: AdminUser[];
}

interface AdminUserResponse {
  message: string;
  user: AdminUser;
}

export async function getAdminUsers():
Promise<AdminUsersResponse> {
  const response =
    await api.get<AdminUsersResponse>(
      "/admin/users"
    );

  return {
    ...response.data,

    total:
      Number(response.data.total) || 0,

    users:
      Array.isArray(response.data.users)
        ? response.data.users
        : []
  };
}

export async function updateAdminUserStatus(
  userId: number,
  accountStatus: AccountStatus
): Promise<AdminUserResponse> {
  const response =
    await api.patch<AdminUserResponse>(
      `/admin/users/${userId}/status`,
      {
        account_status: accountStatus
      }
    );

  return response.data;
}

export async function updateAdminUserRole(
  userId: number,
  role: UserRole
): Promise<AdminUserResponse> {
  const response =
    await api.patch<AdminUserResponse>(
      `/admin/users/${userId}/role`,
      {
        role
      }
    );

  return response.data;
}

/* =====================================================
 * ACTIVIDADES
 * ===================================================== */

export type AdminActivityStatus =
  | "active"
  | "inactive";

export interface AdminActivity {
  id: number;
  title: string;
  description: string;
  category: string | null;
  instructions: string;
  estimated_duration: number;
  status: AdminActivityStatus;
  created_at: string;
}

export interface AdminActivityPayload {
  title: string;
  description: string;
  category: string;
  instructions: string;
  estimated_duration: number;
  status: AdminActivityStatus;
}

export interface AdminActivitiesResponse {
  message: string;
  total: number;
  active_count: number;
  inactive_count: number;
  activities: AdminActivity[];
}

interface AdminActivityResponse {
  message: string;
  activity: AdminActivity;
}

/**
 * Consulta actividades activas e inactivas.
 */
export async function getAdminActivities():
Promise<AdminActivitiesResponse> {
  const response =
    await api.get<AdminActivitiesResponse>(
      "/admin/activities"
    );

  const activities =
    Array.isArray(
      response.data.activities
    )
      ? response.data.activities.map(
          normalizeAdminActivity
        )
      : [];

  const activeCount =
    activities.filter(
      (activity) =>
        activity.status === "active"
    ).length;

  return {
    message:
      response.data.message,

    total:
      Number(response.data.total) ||
      activities.length,

    active_count:
      Number(
        response.data.active_count
      ) || activeCount,

    inactive_count:
      Number(
        response.data.inactive_count
      ) ||
      activities.length - activeCount,

    activities
  };
}

/**
 * Crea una actividad terapéutica.
 */
export async function createAdminActivity(
  payload: AdminActivityPayload
): Promise<AdminActivityResponse> {
  const response =
    await api.post<AdminActivityResponse>(
      "/admin/activities",
      payload
    );

  return {
    ...response.data,

    activity:
      normalizeAdminActivity(
        response.data.activity
      )
  };
}

/**
 * Edita una actividad terapéutica.
 */
export async function updateAdminActivity(
  activityId: number,
  payload: AdminActivityPayload
): Promise<AdminActivityResponse> {
  const response =
    await api.put<AdminActivityResponse>(
      `/admin/activities/${activityId}`,
      payload
    );

  return {
    ...response.data,

    activity:
      normalizeAdminActivity(
        response.data.activity
      )
  };
}

/**
 * Activa o desactiva una actividad.
 */
export async function updateAdminActivityStatus(
  activityId: number,
  status: AdminActivityStatus
): Promise<AdminActivityResponse> {
  const response =
    await api.patch<AdminActivityResponse>(
      `/admin/activities/${activityId}/status`,
      {
        status
      }
    );

  return {
    ...response.data,

    activity:
      normalizeAdminActivity(
        response.data.activity
      )
  };
}

function normalizeAdminActivity(
  activity: AdminActivity
): AdminActivity {
  return {
    ...activity,

    id:
      Number(activity.id),

    estimated_duration:
      Number(
        activity.estimated_duration
      ),

    category:
      activity.category ?? null,

    status:
      activity.status === "inactive"
        ? "inactive"
        : "active"
  };
}

/* =====================================================
 * LOGROS
 * ===================================================== */

export type AdminAchievementStatus =
  | "active"
  | "inactive";

export type AdminAchievementCriterion =
  | "emotion_count"
  | "activity_count"
  | "level"
  | "streak_days"
  | "points";

export interface AdminAchievement {
  id: number;
  code: string;
  title: string;
  description: string;
  criterion_type:
    AdminAchievementCriterion;
  criterion_value: number;
  points_required: number;
  status: AdminAchievementStatus;
  created_at?: string | null;
}

export interface AdminAchievementPayload {
  code: string;
  title: string;
  description: string;
  criterion_type:
    AdminAchievementCriterion;
  criterion_value: number;
  points_required: number;
  status: AdminAchievementStatus;
}

export interface AdminAchievementsResponse {
  message: string;
  total: number;
  active_count: number;
  inactive_count: number;
  achievements: AdminAchievement[];
}

interface AdminAchievementResponse {
  message: string;
  achievement: AdminAchievement;
}

/**
 * Consulta todos los logros administrativos.
 */
export async function getAdminAchievements():
Promise<AdminAchievementsResponse> {
  const response =
    await api.get<
      Partial<AdminAchievementsResponse>
    >(
      "/admin/achievements"
    );

  const achievements =
    Array.isArray(
      response.data.achievements
    )
      ? response.data.achievements.map(
          normalizeAdminAchievement
        )
      : [];

  const activeCount =
    achievements.filter(
      (achievement) =>
        achievement.status === "active"
    ).length;

  return {
    message:
      response.data.message ??
      "Logros consultados correctamente",

    total:
      toAchievementNumber(
        response.data.total,
        achievements.length
      ),

    active_count:
      toAchievementNumber(
        response.data.active_count,
        activeCount
      ),

    inactive_count:
      toAchievementNumber(
        response.data.inactive_count,
        achievements.length -
          activeCount
      ),

    achievements
  };
}

/**
 * Crea un logro.
 */
export async function createAdminAchievement(
  payload: AdminAchievementPayload
): Promise<AdminAchievementResponse> {
  const response =
    await api.post<
      AdminAchievementResponse
    >(
      "/admin/achievements",
      payload
    );

  return {
    ...response.data,

    achievement:
      normalizeAdminAchievement(
        response.data.achievement
      )
  };
}

/**
 * Actualiza un logro existente.
 */
export async function updateAdminAchievement(
  achievementId: number,
  payload: AdminAchievementPayload
): Promise<AdminAchievementResponse> {
  const response =
    await api.put<
      AdminAchievementResponse
    >(
      `/admin/achievements/${achievementId}`,
      payload
    );

  return {
    ...response.data,

    achievement:
      normalizeAdminAchievement(
        response.data.achievement
      )
  };
}

/**
 * Activa o desactiva un logro.
 */
export async function updateAdminAchievementStatus(
  achievementId: number,
  status: AdminAchievementStatus
): Promise<AdminAchievementResponse> {
  const response =
    await api.patch<
      AdminAchievementResponse
    >(
      `/admin/achievements/${achievementId}/status`,
      {
        status
      }
    );

  return {
    ...response.data,

    achievement:
      normalizeAdminAchievement(
        response.data.achievement
      )
  };
}

function normalizeAdminAchievement(
  achievement: AdminAchievement
): AdminAchievement {
  return {
    ...achievement,

    id:
      Number(achievement.id),

    code:
      achievement.code ?? "",

    title:
      achievement.title ?? "",

    description:
      achievement.description ?? "",

    criterion_type:
      normalizeAchievementCriterion(
        achievement.criterion_type
      ),

    criterion_value:
      toAchievementNumber(
        achievement.criterion_value,
        1
      ),

    points_required:
      toAchievementNumber(
        achievement.points_required,
        0
      ),

    status:
      achievement.status === "inactive"
        ? "inactive"
        : "active",

    created_at:
      achievement.created_at ?? null
  };
}

function normalizeAchievementCriterion(
  value: unknown
): AdminAchievementCriterion {
  switch (value) {
    case "emotion_count":
    case "activity_count":
    case "level":
    case "streak_days":
    case "points":
      return value;

    default:
      return "emotion_count";
  }
}

function toAchievementNumber(
  value: unknown,
  fallback = 0
): number {
  const numericValue =
    Number(value);

  return Number.isFinite(
    numericValue
  )
    ? numericValue
    : fallback;
}