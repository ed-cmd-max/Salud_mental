import { api } from "./api";

export type AchievementCriterion =
  | "emotion_count"
  | "activity_count"
  | "level"
  | "streak_days"
  | "points";

export type AchievementStatus =
  | "active"
  | "inactive";

export interface GamificationProgress {
  points: number;
  level: number;
  activities_completed: number;
  streak_days: number;
  last_activity_date: string | null;
  updated_at: string | null;

  points_in_current_level: number;
  points_to_next_level: number;
  next_level_points: number;
  progress_percentage: number;
}

export interface Achievement {
  id: number;
  code: string;
  title: string;
  description: string;
  criterion_type: AchievementCriterion;
  criterion_value: number;
  points_required: number;
  status: AchievementStatus;
  unlocked: boolean;
  unlocked_at: string | null;
}

export interface AchievementsResult {
  total: number;
  unlocked_count: number;
  pending_count: number;
  achievements: Achievement[];
}

type UnknownObject =
  Record<string, unknown>;

/**
 * Consulta los puntos, nivel, racha y avance.
 *
 * Admite diferentes estructuras de respuesta:
 *
 * { progress: {...} }
 * { gamification: {...} }
 * { data: { progress: {...} } }
 * { points: 50, level: 1, ... }
 */
export async function getGamificationProgress():
Promise<GamificationProgress> {
  const response =
    await api.get<UnknownObject>(
      "/gamification/progress"
    );

  const body = response.data;

  const nestedData =
    isObject(body.data)
      ? body.data
      : null;

  let progressSource: UnknownObject;

  if (isObject(body.progress)) {
    progressSource = body.progress;
  } else if (
    isObject(body.gamification)
  ) {
    progressSource = body.gamification;
  } else if (
    nestedData &&
    isObject(nestedData.progress)
  ) {
    progressSource =
      nestedData.progress;
  } else if (
    nestedData &&
    isObject(nestedData.gamification)
  ) {
    progressSource =
      nestedData.gamification;
  } else if (nestedData) {
    progressSource = nestedData;
  } else {
    progressSource = body;
  }

  return normalizeProgress(
    progressSource
  );
}

/**
 * Consulta los logros del usuario.
 */
export async function getAchievements():
Promise<AchievementsResult> {
  const response =
    await api.get<UnknownObject>(
      "/gamification/achievements"
    );

  const body = response.data;

  const nestedData =
    isObject(body.data)
      ? body.data
      : null;

  const source =
    nestedData ?? body;

  const rawAchievements =
    Array.isArray(
      source.achievements
    )
      ? source.achievements
      : [];

  const achievements =
    rawAchievements
      .filter(isObject)
      .map(normalizeAchievement)
      .filter(
        (achievement) =>
          achievement.status === "active"
      );

  const calculatedUnlocked =
    achievements.filter(
      (achievement) =>
        achievement.unlocked
    ).length;

  const total =
    getNumber(
      source,
      [
        "total",
        "total_achievements",
        "total_logros"
      ],
      achievements.length
    );

  const unlockedCount =
    getNumber(
      source,
      [
        "unlocked_count",
        "unlockedCount",
        "logros_desbloqueados"
      ],
      calculatedUnlocked
    );

  const pendingCount =
    getNumber(
      source,
      [
        "pending_count",
        "pendingCount",
        "logros_pendientes"
      ],
      Math.max(
        total - unlockedCount,
        0
      )
    );

  return {
    total,
    unlocked_count:
      unlockedCount,
    pending_count:
      pendingCount,
    achievements
  };
}

function normalizeProgress(
  source: UnknownObject
): GamificationProgress {
  const points =
    getNumber(
      source,
      [
        "points",
        "puntos",
        "total_points",
        "total_puntos"
      ],
      0
    );

  const level =
    Math.max(
      getNumber(
        source,
        [
          "level",
          "nivel",
          "current_level"
        ],
        1
      ),
      1
    );

  const activitiesCompleted =
    getNumber(
      source,
      [
        "activities_completed",
        "activitiesCompleted",
        "completed_activities",
        "actividades_completadas"
      ],
      0
    );

  const streakDays =
    getNumber(
      source,
      [
        "streak_days",
        "streakDays",
        "current_streak",
        "racha_dias"
      ],
      0
    );

  const lastActivityDate =
    getString(
      source,
      [
        "last_activity_date",
        "lastActivityDate",
        "last_activity",
        "fecha_ultima_actividad"
      ]
    );

  const updatedAt =
    getString(
      source,
      [
        "updated_at",
        "updatedAt",
        "fecha_actualizacion"
      ]
    );

  const currentLevelStart =
    (level - 1) * 100;

  const calculatedPointsInLevel =
    Math.max(
      points - currentLevelStart,
      0
    );

  const pointsInCurrentLevel =
    getNumber(
      source,
      [
        "points_in_current_level",
        "pointsInCurrentLevel",
        "puntos_nivel_actual"
      ],
      calculatedPointsInLevel
    );

  const nextLevelPoints =
    getNumber(
      source,
      [
        "next_level_points",
        "nextLevelPoints",
        "puntos_siguiente_nivel"
      ],
      level * 100
    );

  const pointsToNextLevel =
    getNumber(
      source,
      [
        "points_to_next_level",
        "pointsToNextLevel",
        "puntos_faltantes"
      ],
      Math.max(
        nextLevelPoints - points,
        0
      )
    );

  const calculatedPercentage =
    Math.min(
      Math.max(
        pointsInCurrentLevel,
        0
      ),
      100
    );

  const progressPercentage =
    getNumber(
      source,
      [
        "progress_percentage",
        "progressPercentage",
        "porcentaje_progreso"
      ],
      calculatedPercentage
    );

  return {
    points,
    level,

    activities_completed:
      activitiesCompleted,

    streak_days:
      streakDays,

    last_activity_date:
      lastActivityDate,

    updated_at:
      updatedAt,

    points_in_current_level:
      pointsInCurrentLevel,

    points_to_next_level:
      pointsToNextLevel,

    next_level_points:
      nextLevelPoints,

    progress_percentage:
      Math.min(
        Math.max(
          progressPercentage,
          0
        ),
        100
      )
  };
}

function normalizeAchievement(
  source: UnknownObject
): Achievement {
  const code =
    getString(
      source,
      [
        "code",
        "codigo"
      ]
    ) ?? "";

  const inferredCriterion =
    inferCriterionFromCode(code);

  const criterionType =
    normalizeCriterionType(
      getString(
        source,
        [
          "criterion_type",
          "criterionType",
          "tipo_criterio"
        ]
      )
    ) ??
    inferredCriterion.type;

  const criterionValue =
    getNumber(
      source,
      [
        "criterion_value",
        "criterionValue",
        "valor_criterio"
      ],
      inferredCriterion.value
    );

  return {
    id:
      getNumber(
        source,
        ["id"],
        0
      ),

    code,

    title:
      getString(
        source,
        [
          "title",
          "name",
          "nombre"
        ]
      ) ??
      "Logro",

    description:
      getString(
        source,
        [
          "description",
          "descripcion"
        ]
      ) ??
      "",

    criterion_type:
      criterionType,

    criterion_value:
      criterionValue,

    points_required:
      getNumber(
        source,
        [
          "points_required",
          "pointsRequired",
          "puntos_requeridos"
        ],
        criterionType === "points"
          ? criterionValue
          : 0
      ),

    status:
      normalizeStatus(
        getString(
          source,
          [
            "status",
            "estado"
          ]
        )
      ),

    unlocked:
      getBoolean(
        source,
        [
          "unlocked",
          "is_unlocked",
          "desbloqueado"
        ],
        false
      ),

    unlocked_at:
      getString(
        source,
        [
          "unlocked_at",
          "unlockedAt",
          "fecha_desbloqueo"
        ]
      )
  };
}

function inferCriterionFromCode(
  code: string
): {
  type: AchievementCriterion;
  value: number;
} {
  switch (code.toUpperCase()) {
    case "FIRST_EMOTION":
      return {
        type: "emotion_count",
        value: 1
      };

    case "FIVE_EMOTIONS":
      return {
        type: "emotion_count",
        value: 5
      };

    case "FIRST_ACTIVITY":
      return {
        type: "activity_count",
        value: 1
      };

    case "THREE_ACTIVITIES":
      return {
        type: "activity_count",
        value: 3
      };

    case "LEVEL_TWO":
      return {
        type: "level",
        value: 2
      };

    case "THREE_DAY_STREAK":
      return {
        type: "streak_days",
        value: 3
      };

    default:
      return {
        type: "points",
        value: 1
      };
  }
}

function normalizeCriterionType(
  value: string | null
): AchievementCriterion | null {
  switch (value) {
    case "emotion_count":
    case "activity_count":
    case "level":
    case "streak_days":
    case "points":
      return value;

    default:
      return null;
  }
}

function normalizeStatus(
  value: string | null
): AchievementStatus {
  return value === "inactive"
    ? "inactive"
    : "active";
}

function isObject(
  value: unknown
): value is UnknownObject {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getValue(
  object: UnknownObject,
  keys: string[]
): unknown {
  for (const key of keys) {
    const value = object[key];

    if (
      value !== undefined &&
      value !== null
    ) {
      return value;
    }
  }

  return undefined;
}

function getNumber(
  object: UnknownObject,
  keys: string[],
  fallback = 0
): number {
  const value =
    getValue(object, keys);

  const numericValue =
    Number(value);

  return Number.isFinite(
    numericValue
  )
    ? numericValue
    : fallback;
}

function getString(
  object: UnknownObject,
  keys: string[]
): string | null {
  const value =
    getValue(object, keys);

  if (
    typeof value !== "string" ||
    value.trim() === ""
  ) {
    return null;
  }

  return value.trim();
}

function getBoolean(
  object: UnknownObject,
  keys: string[],
  fallback = false
): boolean {
  const value =
    getValue(object, keys);

  if (value === true) {
    return true;
  }

  if (value === false) {
    return false;
  }

  if (
    typeof value === "string"
  ) {
    return (
      value.toLowerCase() ===
      "true"
    );
  }

  if (
    typeof value === "number"
  ) {
    return value === 1;
  }

  return fallback;
}