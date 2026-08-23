import { api } from "./api";

export interface EmotionRecord {
  id: number;
  user_id: number;
  mood: string;
  intensity: number;
  note: string | null;
  record_date: string;
  created_at: string;
}

export interface GamificationProgress {
  points: number;
  level: number;
  activities_completed: number;
  streak_days: number;
  last_activity_date: string | null;
  updated_at: string;
}

export interface CreateEmotionPayload {
  emotion: string;
  intensity: number;
  description?: string;
  fecha_registro: string;
}

export interface CreateEmotionPayload {
  emotion: string;
  intensity: number;
  description?: string;
  fecha_registro: string;
}

export interface UnlockedAchievement {
  id: number;
  code: string;
  title: string;
  description: string | null;
  criterion_type: string;
}

export interface CreateEmotionResponse {
  message: string;

  emotion: EmotionRecord;

  points_added: number;

  progress:
    GamificationProgress;

  unlocked_achievements:
    UnlockedAchievement[];
}


export type EmotionPeriod =
  | "hoy"
  | "semana"
  | "mes";

export interface EmotionHistoryFilters {
  periodo?: EmotionPeriod;
  fecha_inicio?: string;
  fecha_fin?: string;
  emocion?: string;
  intensidad?: number;
}

export interface EmotionDistributionItem {
  emotion: string;
  total: number;
}

export interface EmotionSummary {
  totalRecords: number;
  averageIntensity: number;
  predominantEmotion: string | null;
  distribution: EmotionDistributionItem[];
}

export interface EmotionHistoryGroup {
  date: string;
  records: EmotionRecord[];
}

export interface EmotionHistoryResponse {
  message: string;
  groups: EmotionHistoryGroup[];
  summary: EmotionSummary;
}

type UnknownObject =
  Record<string, unknown>;

const EMPTY_SUMMARY: EmotionSummary = {
  totalRecords: 0,
  averageIntensity: 0,
  predominantEmotion: null,
  distribution: []
};

/**
 * Registra una emoción.
 */
export async function createEmotion(
  payload: CreateEmotionPayload
): Promise<CreateEmotionResponse> {
  const response =
    await api.post<CreateEmotionResponse>(
      "/emotions",
      payload
    );

  return response.data;
}

/**
 * Consulta el historial emocional.
 */
export async function getEmotionHistory(
  filters: EmotionHistoryFilters = {}
): Promise<EmotionHistoryResponse> {
  const response =
    await api.get<UnknownObject>(
      "/emotions/history",
      {
        params: cleanFilters(filters)
      }
    );

  const rawHistory =
    isObject(response.data.history)
      ? response.data.history
      : {};

  const groups: EmotionHistoryGroup[] =
    Object.entries(rawHistory)
      .map(([rawDate, rawRecords]) => ({
        date: normalizeDateKey(rawDate),

        records: Array.isArray(rawRecords)
          ? (
              rawRecords as EmotionRecord[]
            )
          : []
      }))
      .sort((first, second) =>
        second.date.localeCompare(
          first.date
        )
      );

  const localSummary =
    calculateSummaryFromGroups(groups);

  const backendSummary =
    normalizeSummary(
      response.data.summary
    );

  /*
   * Si existen registros, pero el backend fue
   * interpretado como cero, usamos el cálculo
   * realizado directamente desde los registros.
   */
  const summary =
    backendSummary.totalRecords > 0 ||
    localSummary.totalRecords === 0
      ? mergeSummaries(
          backendSummary,
          localSummary
        )
      : localSummary;

  return {
    message:
      typeof response.data.message ===
      "string"
        ? response.data.message
        : "Historial emocional obtenido correctamente",

    groups,
    summary
  };
}

/**
 * Consulta las estadísticas.
 */
export async function getEmotionStats(
  filters: EmotionHistoryFilters = {}
): Promise<EmotionSummary> {
  const response =
    await api.get<UnknownObject>(
      "/emotions/stats",
      {
        params: cleanFilters(filters)
      }
    );

  /*
   * El backend puede responder:
   *
   * { summary: {...} }
   * { stats: {...} }
   * { total_registros: ..., ... }
   */
  const summarySource =
    response.data.stats ??
    response.data.summary ??
    response.data;

  return normalizeSummary(summarySource);
}

function cleanFilters(
  filters: EmotionHistoryFilters
): Record<string, string | number> {
  const params:
    Record<string, string | number> = {};

  if (filters.periodo) {
    params.periodo = filters.periodo;
  }

  if (filters.fecha_inicio?.trim()) {
    params.fecha_inicio =
      filters.fecha_inicio.trim();
  }

  if (filters.fecha_fin?.trim()) {
    params.fecha_fin =
      filters.fecha_fin.trim();
  }

  if (filters.emocion?.trim()) {
    params.emocion =
      filters.emocion.trim();
  }

  if (
    filters.intensidad !== undefined
  ) {
    params.intensidad =
      filters.intensidad;
  }

  return params;
}

function normalizeSummary(
  value: unknown
): EmotionSummary {
  if (!isObject(value)) {
    return EMPTY_SUMMARY;
  }

  const totalRecords = getNumber(
    value,
    [
      "total_registros",
      "total_records",
      "totalRecords",
      "total",
      "count"
    ]
  );

  const averageIntensity = getNumber(
    value,
    [
      "intensidad_promedio",
      "average_intensity",
      "averageIntensity",
      "promedio_intensidad"
    ]
  );

  const predominantEmotion = getString(
    value,
    [
      "emocion_predominante",
      "predominant_emotion",
      "predominantEmotion",
      "most_common_mood",
      "dominant_emotion"
    ]
  );

  const rawDistribution = getValue(
    value,
    [
      "distribucion_emociones",
      "emotion_distribution",
      "distribution",
      "distribucion"
    ]
  );

  return {
    totalRecords,
    averageIntensity,
    predominantEmotion,
    distribution:
      normalizeDistribution(
        rawDistribution
      )
  };
}

/**
 * Calcula el resumen directamente desde los
 * registros visibles.
 *
 * Esto evita que el resumen aparezca en cero
 * cuando el endpoint de estadísticas utiliza
 * nombres diferentes.
 */
function calculateSummaryFromGroups(
  groups: EmotionHistoryGroup[]
): EmotionSummary {
  const records = groups.flatMap(
    (group) => group.records
  );

  if (records.length === 0) {
    return EMPTY_SUMMARY;
  }

  const distributionMap =
    new Map<string, number>();

  let intensityTotal = 0;

  for (const record of records) {
    intensityTotal += Number(
      record.intensity
    );

    const currentTotal =
      distributionMap.get(
        record.mood
      ) ?? 0;

    distributionMap.set(
      record.mood,
      currentTotal + 1
    );
  }

  const distribution =
    Array.from(
      distributionMap.entries()
    )
      .map(([emotion, total]) => ({
        emotion,
        total
      }))
      .sort(
        (first, second) =>
          second.total - first.total
      );

  return {
    totalRecords: records.length,

    averageIntensity:
      intensityTotal /
      records.length,

    predominantEmotion:
      distribution[0]?.emotion ??
      null,

    distribution
  };
}

function mergeSummaries(
  backendSummary: EmotionSummary,
  localSummary: EmotionSummary
): EmotionSummary {
  return {
    totalRecords:
      backendSummary.totalRecords ||
      localSummary.totalRecords,

    averageIntensity:
      backendSummary.averageIntensity ||
      localSummary.averageIntensity,

    predominantEmotion:
      backendSummary.predominantEmotion ||
      localSummary.predominantEmotion,

    distribution:
      backendSummary.distribution.length >
      0
        ? backendSummary.distribution
        : localSummary.distribution
  };
}

function normalizeDistribution(
  value: unknown
): EmotionDistributionItem[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (!isObject(item)) {
          return null;
        }

        const emotion =
          getString(
            item,
            [
              "emotion",
              "emocion",
              "mood"
            ]
          ) ?? "";

        const total =
          getNumber(
            item,
            [
              "total",
              "cantidad",
              "count"
            ]
          );

        if (!emotion || total <= 0) {
          return null;
        }

        return {
          emotion,
          total
        };
      })
      .filter(
        (
          item
        ): item is EmotionDistributionItem =>
          item !== null
      );
  }

  if (isObject(value)) {
    return Object.entries(value)
      .map(([emotion, rawTotal]) => {
        if (isObject(rawTotal)) {
          return {
            emotion,

            total: getNumber(
              rawTotal,
              [
                "total",
                "cantidad",
                "count"
              ]
            )
          };
        }

        return {
          emotion,
          total: Number(rawTotal)
        };
      })
      .filter(
        (item) =>
          item.emotion !== "" &&
          item.total > 0
      );
  }

  return [];
}

/**
 * Convierte:
 *
 * Thu May 08 2025 00:00:00 GMT-0500...
 *
 * en:
 *
 * 2025-05-08
 */
function normalizeDateKey(
  value: string
): string {
  const isoMatch = value.match(
    /^\d{4}-\d{2}-\d{2}/
  );

  if (isoMatch) {
    return isoMatch[0];
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
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
    if (
      object[key] !== undefined &&
      object[key] !== null
    ) {
      return object[key];
    }
  }

  return undefined;
}

function getNumber(
  object: UnknownObject,
  keys: string[]
): number {
  const value = getValue(
    object,
    keys
  );

  const numericValue = Number(value);

  return Number.isFinite(numericValue)
    ? numericValue
    : 0;
}

function getString(
  object: UnknownObject,
  keys: string[]
): string | null {
  const value = getValue(
    object,
    keys
  );

  if (
    typeof value !== "string" ||
    value.trim() === ""
  ) {
    return null;
  }

  return value.trim();
}