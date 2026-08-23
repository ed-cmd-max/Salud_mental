import { api } from "./api";

export type ActivityStatus =
  | "active"
  | "inactive";

export interface Activity {
  id: number;
  title: string;
  description: string;
  category: string | null;
  instructions: string;
  estimated_duration: number;
  status: ActivityStatus;
  created_at: string;
}

export interface ActivityProgress {
  points: number;
  level: number;
  activities_completed: number;
  streak_days: number;
  last_activity_date: string | null;
  updated_at: string;
}

export interface ActivityResponseRecord {
  id: number;
  user_id: number;
  activity_id: number;
  response: string;

  activity_status:
    | "started"
    | "in_progress"
    | "completed";

  observation: string | null;
  points_awarded: boolean;
  completed_at: string;
}

export interface CompletedActivityRecord {
  id: number;
  response: string;

  activity_status:
    | "started"
    | "in_progress"
    | "completed";

  observation: string | null;
  points_awarded: boolean;
  completed_at: string;

  activity_id: number;
  title: string;
  description: string;
  category: string | null;
  instructions: string;
  estimated_duration: number;

  activity_catalog_status:
    ActivityStatus;
}

interface ActivityListResponse {
  message: string;
  total: number;
  activities: Activity[];
}

interface ActivityDetailResponse {
  activity: Activity;
}

export interface CompleteActivityPayload {
  response: string;
  observation?: string;
}

/*
 * Logro desbloqueado específicamente
 * durante una acción de gamificación.
 */
export interface UnlockedAchievement {
  id: number;
  code: string;
  title: string;
  description: string | null;
  criterion_type: string;
}

export interface CompleteActivityResponse {
  message: string;

  activity_response:
    ActivityResponseRecord;

  points_added: number;

  already_rewarded: boolean;

  progress:
    ActivityProgress;

  /*
   * Puede contener cero, uno o varios
   * logros desbloqueados en esta acción.
   */
  unlocked_achievements:
    UnlockedAchievement[];
}

export interface CompletedActivitiesResponse {
  message: string;
  total: number;

  activity_responses:
    CompletedActivityRecord[];
}

/**
 * Obtiene únicamente las
 * actividades activas.
 */
export async function getActivities():
Promise<ActivityListResponse> {
  const response =
    await api.get<ActivityListResponse>(
      "/activities"
    );

  return response.data;
}

/**
 * Consulta el detalle de una
 * actividad activa.
 */
export async function getActivityById(
  activityId: number
): Promise<Activity> {
  const response =
    await api.get<ActivityDetailResponse>(
      `/activities/${activityId}`
    );

  return response.data.activity;
}

/**
 * Guarda la respuesta de una actividad
 * y recibe el progreso actualizado junto
 * con los logros recién desbloqueados.
 */
export async function completeActivity(
  activityId: number,
  payload: CompleteActivityPayload
): Promise<CompleteActivityResponse> {
  const response =
    await api.post<CompleteActivityResponse>(
      `/activities/${activityId}/responses`,
      payload
    );

  return response.data;
}

/**
 * Consulta el historial de actividades
 * realizadas por el usuario autenticado.
 */
export async function getCompletedActivities():
Promise<CompletedActivitiesResponse> {
  const response =
    await api.get<CompletedActivitiesResponse>(
      "/activities/completed"
    );

  return response.data;
}