import { pool } from "../config/db.js";
import { applyGamificationEvent } from "../services/gamification.service.js";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/*
 * Fecha actual tomando como referencia
 * la zona horaria de Ecuador.
 *
 * Esto evita que PostgreSQL considere
 * que ya es el día siguiente cuando
 * el servidor trabaja en UTC.
 */
const ECUADOR_CURRENT_DATE =
  "(CURRENT_TIMESTAMP AT TIME ZONE 'America/Guayaquil')::date";

function isValidDate(value) {
  if (!DATE_REGEX.test(value)) {
    return false;
  }

  const [year, month, day] =
    value.split("-").map(Number);

  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day
    )
  );

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() ===
      month - 1 &&
    date.getUTCDate() === day
  );
}

function firstValue(...values) {
  const value = values.find(
    (item) =>
      item !== undefined &&
      item !== null &&
      String(item).trim() !== ""
  );

  return value === undefined
    ? null
    : String(value).trim();
}

function validationError(message) {
  const error = new Error(message);

  error.status = 400;

  return error;
}

function buildEmotionFilters(
  query,
  userId
) {
  const startDate = firstValue(
    query.fecha_inicio,
    query.from
  );

  const endDate = firstValue(
    query.fecha_fin,
    query.to
  );

  const mood = firstValue(
    query.emocion,
    query.emotion,
    query.mood
  );

  const intensityValue = firstValue(
    query.intensidad,
    query.intensity
  );

  const periodValue = firstValue(
    query.periodo,
    query.period
  );

  /*
   * Validación de fechas.
   */
  if (
    startDate &&
    !isValidDate(startDate)
  ) {
    throw validationError(
      "La fecha inicial debe tener formato YYYY-MM-DD y ser válida"
    );
  }

  if (
    endDate &&
    !isValidDate(endDate)
  ) {
    throw validationError(
      "La fecha final debe tener formato YYYY-MM-DD y ser válida"
    );
  }

  if (
    startDate &&
    endDate &&
    startDate > endDate
  ) {
    throw validationError(
      "La fecha inicial no puede ser posterior a la fecha final"
    );
  }

  /*
   * No se permite mandar simultáneamente
   * un periodo y un rango personalizado.
   */
  if (
    periodValue &&
    (startDate || endDate)
  ) {
    throw validationError(
      "Utilice periodo o rango de fechas, pero no ambos al mismo tiempo"
    );
  }

  /*
   * Intensidad.
   */
  let intensity = null;

  if (intensityValue !== null) {
    intensity =
      Number(intensityValue);

    if (
      !Number.isInteger(
        intensity
      ) ||
      intensity < 1 ||
      intensity > 10
    ) {
      throw validationError(
        "La intensidad del filtro debe ser un número entero entre 1 y 10"
      );
    }
  }

  /*
   * Periodos aceptados.
   */
  let normalizedPeriod = null;

  if (periodValue) {
    const period =
      periodValue.toLowerCase();

    const periodMap = {
      hoy: "hoy",
      today: "hoy",

      semana: "semana",
      week: "semana",
      "7d": "semana",

      mes: "mes",
      month: "mes",
      "30d": "mes"
    };

    normalizedPeriod =
      periodMap[period];

    if (!normalizedPeriod) {
      throw validationError(
        "El periodo debe ser hoy, semana o mes"
      );
    }
  }

  /*
   * Todas las consultas quedan limitadas
   * al usuario autenticado.
   */
  const conditions = [
    "e.user_id = $1"
  ];

  const params = [
    userId
  ];

  /*
   * Rango personalizado.
   */
  if (startDate) {
    params.push(startDate);

    conditions.push(
      `e.record_date >= $${params.length}::date`
    );
  }

  if (endDate) {
    params.push(endDate);

    conditions.push(
      `e.record_date <= $${params.length}::date`
    );
  }

  /*
   * Emoción.
   */
  if (mood) {
    params.push(mood);

    conditions.push(
      `LOWER(e.mood) = LOWER($${params.length})`
    );
  }

  /*
   * Intensidad.
   */
  if (intensity !== null) {
    params.push(intensity);

    conditions.push(
      `e.intensity = $${params.length}`
    );
  }

  /*
   * Periodos utilizando la fecha
   * real de Ecuador.
   */

  // Solamente el día actual.
  if (
    normalizedPeriod === "hoy"
  ) {
    conditions.push(
      `e.record_date = ${ECUADOR_CURRENT_DATE}`
    );
  }

  /*
   * Últimos 7 días contando hoy.
   *
   * Ejemplo:
   * si hoy es 20/08:
   * desde 14/08 hasta 20/08.
   */
  if (
    normalizedPeriod === "semana"
  ) {
    conditions.push(
      `e.record_date >= ${ECUADOR_CURRENT_DATE} - 6`
    );

    conditions.push(
      `e.record_date <= ${ECUADOR_CURRENT_DATE}`
    );
  }

  /*
   * Últimos 30 días contando hoy.
   */
  if (
    normalizedPeriod === "mes"
  ) {
    conditions.push(
      `e.record_date >= ${ECUADOR_CURRENT_DATE} - 29`
    );

    conditions.push(
      `e.record_date <= ${ECUADOR_CURRENT_DATE}`
    );
  }

  return {
    whereClause:
      conditions.join(" AND "),

    params,

    filters: {
      fecha_inicio:
        startDate,

      fecha_fin:
        endDate,

      periodo:
        normalizedPeriod,

      emocion:
        mood,

      intensidad:
        intensity
    }
  };
}

function calculateSummary(records) {
  if (
    records.length === 0
  ) {
    return {
      total_registros: 0,
      intensidad_promedio: 0,
      emocion_predominante: null,
      distribucion_emociones: {}
    };
  }

  const moodCount = {};

  let totalIntensity = 0;

  records.forEach((item) => {
    totalIntensity +=
      Number(item.intensity);

    moodCount[item.mood] =
      (moodCount[item.mood] || 0) +
      1;
  });

  const mostFrequentMood =
    Object.entries(moodCount)
      .sort(
        (a, b) =>
          b[1] - a[1]
      )[0][0];

  return {
    total_registros:
      records.length,

    intensidad_promedio:
      Number(
        (
          totalIntensity /
          records.length
        ).toFixed(2)
      ),

    emocion_predominante:
      mostFrequentMood,

    distribucion_emociones:
      moodCount
  };
}

/*
 * =====================================================
 * CREAR EMOCIÓN
 * =====================================================
 */
export async function createEmotion(
  req,
  res
) {
  let client;

  try {
    const {
      mood,
      emotion,
      intensity,
      note,
      description,
      record_date,
      fecha_registro
    } = req.body;

    const selectedMood =
      String(
        mood ??
          emotion ??
          ""
      ).trim();

    const selectedNoteValue =
      note ??
      description ??
      null;

    const selectedNote =
      selectedNoteValue
        ? String(
            selectedNoteValue
          ).trim()
        : null;

    const selectedDate =
      firstValue(
        record_date,
        fecha_registro
      );

    /*
     * Campos obligatorios.
     */
    if (
      !selectedMood ||
      intensity === undefined
    ) {
      return res
        .status(400)
        .json({
          message:
            "La emoción y la intensidad son obligatorias"
        });
    }

    /*
     * Longitud de emoción.
     */
    if (
      selectedMood.length > 50
    ) {
      return res
        .status(400)
        .json({
          message:
            "La emoción no puede superar los 50 caracteres"
        });
    }

    /*
     * Longitud de descripción.
     */
    if (
      selectedNote &&
      selectedNote.length > 500
    ) {
      return res
        .status(400)
        .json({
          message:
            "La descripción no puede superar los 500 caracteres"
        });
    }

    /*
     * Intensidad.
     */
    const numericIntensity =
      Number(intensity);

    if (
      !Number.isInteger(
        numericIntensity
      ) ||
      numericIntensity < 1 ||
      numericIntensity > 10
    ) {
      return res
        .status(400)
        .json({
          message:
            "La intensidad debe ser un número entero entre 1 y 10"
        });
    }

    /*
     * Formato de fecha.
     */
    if (
      selectedDate &&
      !isValidDate(
        selectedDate
      )
    ) {
      return res
        .status(400)
        .json({
          message:
            "La fecha de registro debe tener formato YYYY-MM-DD y ser válida"
        });
    }

    client =
      await pool.connect();

    await client.query(
      "BEGIN"
    );

    /*
     * Evita fechas futuras utilizando
     * la zona horaria de Ecuador.
     */
    const dateValidation =
      await client.query(
        `SELECT
          COALESCE(
            $1::date,
            ${ECUADOR_CURRENT_DATE}
          ) <=
          ${ECUADOR_CURRENT_DATE}
          AS valid_date`,
        [selectedDate]
      );

    if (
      !dateValidation.rows[0]
        .valid_date
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res
        .status(400)
        .json({
          message:
            "La fecha de registro no puede ser futura"
        });
    }

    /*
     * Registro emocional.
     */
    const result =
      await client.query(
        `INSERT INTO emotions (
          user_id,
          mood,
          intensity,
          note,
          record_date
        )
        VALUES (
          $1,
          $2,
          $3,
          $4,
          COALESCE(
            $5::date,
            ${ECUADOR_CURRENT_DATE}
          )
        )
        RETURNING
          id,
          user_id,
          mood,
          intensity,
          note,
          record_date,
          created_at`,
        [
          req.user.id,
          selectedMood,
          numericIntensity,
          selectedNote,
          selectedDate
        ]
      );

    /*
     * Gamificación.
     */
    const gamificationResult =
      await applyGamificationEvent(
        client,
        {
          userId:
            req.user.id,

          eventType:
            "EMOTION_REGISTERED"
        }
      );

    await client.query(
      "COMMIT"
    );

    return res.status(201).json({
  message:
    "Estado emocional registrado correctamente",

  emotion:
    result.rows[0],

  points_added:
    gamificationResult.points_added,

  progress:
    gamificationResult.progress,

  unlocked_achievements:
    gamificationResult
      .unlocked_achievements
});
    
  } catch (error) {
    if (client) {
      try {
        await client.query(
          "ROLLBACK"
        );
      } catch (
        rollbackError
      ) {
        console.error(
          "Error al revertir la transacción:",
          rollbackError
        );
      }
    }

    console.error(
      "Error al registrar emoción:",
      error
    );

    return res
      .status(500)
      .json({
        message:
          "Error al registrar emoción"
      });
  } finally {
    client?.release();
  }
}

/*
 * =====================================================
 * LISTAR EMOCIONES
 * =====================================================
 */
export async function getEmotions(
  req,
  res
) {
  try {
    const {
      whereClause,
      params,
      filters
    } =
      buildEmotionFilters(
        req.query,
        req.user.id
      );

    const result =
      await pool.query(
        `SELECT
          e.id,
          e.user_id,
          e.mood,
          e.intensity,
          e.note,
          e.record_date,
          e.created_at
         FROM emotions e
         WHERE ${whereClause}
         ORDER BY
          e.record_date DESC,
          e.created_at DESC`,
        params
      );

    return res.json({
      filters,
      total:
        result.rows.length,
      emotions:
        result.rows
    });
  } catch (error) {
    if (
      error.status === 400
    ) {
      return res
        .status(400)
        .json({
          message:
            error.message
        });
    }

    console.error(
      "Error al obtener emociones:",
      error
    );

    return res
      .status(500)
      .json({
        message:
          "Error al obtener emociones"
      });
  }
}

/*
 * =====================================================
 * HISTORIAL EMOCIONAL
 * =====================================================
 */
export async function getEmotionHistory(
  req,
  res
) {
  try {
    const {
      whereClause,
      params,
      filters
    } =
      buildEmotionFilters(
        req.query,
        req.user.id
      );

    const result =
      await pool.query(
        `SELECT
          e.id,
          e.user_id,
          e.mood,
          e.intensity,
          e.note,
          e.record_date,
          e.created_at
         FROM emotions e
         WHERE ${whereClause}
         ORDER BY
          e.record_date DESC,
          e.created_at DESC`,
        params
      );

    const records =
      result.rows;

    const history =
      records.reduce(
        (acc, item) => {
          const date =
            item.record_date;

          if (!acc[date]) {
            acc[date] = [];
          }

          acc[date].push(
            item
          );

          return acc;
        },
        {}
      );

    return res.json({
      message:
        records.length > 0
          ? "Historial emocional obtenido correctamente"
          : "No existen registros emocionales para los filtros seleccionados",

      filters,

      summary:
        calculateSummary(
          records
        ),

      history
    });
  } catch (error) {
    if (
      error.status === 400
    ) {
      return res
        .status(400)
        .json({
          message:
            error.message
        });
    }

    console.error(
      "Error al obtener historial emocional:",
      error
    );

    return res
      .status(500)
      .json({
        message:
          "Error al obtener historial emocional"
      });
  }
}

/*
 * =====================================================
 * ESTADÍSTICAS
 * =====================================================
 */
export async function getEmotionStats(
  req,
  res
) {
  try {
    const {
      whereClause,
      params,
      filters
    } =
      buildEmotionFilters(
        req.query,
        req.user.id
      );

    const result =
      await pool.query(
        `SELECT
          e.mood,
          e.intensity
         FROM emotions e
         WHERE ${whereClause}`,
        params
      );

    return res.json({
      filters,
      ...calculateSummary(
        result.rows
      )
    });
  } catch (error) {
    if (
      error.status === 400
    ) {
      return res
        .status(400)
        .json({
          message:
            error.message
        });
    }

    console.error(
      "Error al obtener estadísticas emocionales:",
      error
    );

    return res
      .status(500)
      .json({
        message:
          "Error al obtener estadísticas"
      });
  }
}

/*
 * =====================================================
 * ELIMINAR EMOCIÓN
 * =====================================================
 */
export async function deleteEmotion(
  req,
  res
) {
  try {
    const {
      id
    } = req.params;

    const exists =
      await pool.query(
        `SELECT id
         FROM emotions
         WHERE id = $1
         AND user_id = $2`,
        [
          id,
          req.user.id
        ]
      );

    if (
      exists.rows.length === 0
    ) {
      return res
        .status(404)
        .json({
          message:
            "Registro emocional no encontrado"
        });
    }

    await pool.query(
      `DELETE FROM emotions
       WHERE id = $1
       AND user_id = $2`,
      [
        id,
        req.user.id
      ]
    );

    return res.json({
      message:
        "Registro emocional eliminado correctamente"
    });
  } catch (error) {
    console.error(
      "Error al eliminar emoción:",
      error
    );

    return res
      .status(500)
      .json({
        message:
          "Error al eliminar emoción"
      });
  }
}