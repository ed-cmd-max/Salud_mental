import { pool } from "../config/db.js";

const ACTIVITY_POINTS = 20;
const MAX_RESPONSE_LENGTH = 2000;
const MAX_OBSERVATION_LENGTH = 500;

/**
 * Convierte un identificador recibido por URL en un entero positivo.
 */
function parsePositiveId(value) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

/**
 * Convierte un valor opcional en texto limpio.
 * Devuelve null cuando está vacío.
 */
function normalizeOptionalText(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();

  return text === "" ? null : text;
}

/**
 * GET /api/activities
 * Lista únicamente las actividades activas.
 */
export async function getActivities(req, res) {
  try {
    const result = await pool.query(
      `SELECT
        id,
        title,
        description,
        category,
        instructions,
        estimated_duration,
        status,
        created_at
       FROM activities
       WHERE status = 'active'
       ORDER BY id ASC`
    );

    return res.json({
      message:
        result.rows.length > 0
          ? "Actividades terapéuticas obtenidas correctamente"
          : "No existen actividades terapéuticas disponibles",
      total: result.rows.length,
      activities: result.rows
    });
  } catch (error) {
    console.error("Error al obtener actividades:", error);

    return res.status(500).json({
      message: "Error al obtener actividades"
    });
  }
}

/**
 * GET /api/activities/:id
 * Devuelve el detalle de una actividad activa.
 */
export async function getActivityById(req, res) {
  try {
    const activityId = parsePositiveId(req.params.id);

    if (!activityId) {
      return res.status(400).json({
        message: "El identificador de la actividad no es válido"
      });
    }

    const result = await pool.query(
      `SELECT
        id,
        title,
        description,
        category,
        instructions,
        estimated_duration,
        status,
        created_at
       FROM activities
       WHERE id = $1
         AND status = 'active'`,
      [activityId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Actividad no encontrada o no disponible"
      });
    }

    return res.json({
      activity: result.rows[0]
    });
  } catch (error) {
    console.error("Error al obtener actividad:", error);

    return res.status(500).json({
      message: "Error al obtener actividad"
    });
  }
}

/**
 * POST /api/activities/:id/responses
 * Registra una actividad completada.
 *
 * La primera vez que el usuario completa una actividad:
 * - guarda la respuesta;
 * - suma 20 puntos;
 * - actualiza el nivel;
 * - verifica logros.
 *
 * Las repeticiones se guardan, pero no vuelven a otorgar puntos.
 */
export async function saveActivityResponse(req, res) {
  let client;

  try {
    const activityId = parsePositiveId(req.params.id);

    if (!activityId) {
      return res.status(400).json({
        message: "El identificador de la actividad no es válido"
      });
    }

    const responseValue =
      req.body.response ??
      req.body.response_usuario ??
      req.body.reflection;

    const userResponse = normalizeOptionalText(responseValue);
    const observation = normalizeOptionalText(
      req.body.observation ?? req.body.observacion
    );

    if (!userResponse) {
      return res.status(400).json({
        message: "La respuesta de la actividad es obligatoria"
      });
    }

    if (userResponse.length > MAX_RESPONSE_LENGTH) {
      return res.status(400).json({
        message:
          `La respuesta no puede superar los ` +
          `${MAX_RESPONSE_LENGTH} caracteres`
      });
    }

    if (
      observation &&
      observation.length > MAX_OBSERVATION_LENGTH
    ) {
      return res.status(400).json({
        message:
          `La observación no puede superar los ` +
          `${MAX_OBSERVATION_LENGTH} caracteres`
      });
    }

    client = await pool.connect();
    await client.query("BEGIN");

    const activityResult = await client.query(
      `SELECT
        id,
        title,
        status
       FROM activities
       WHERE id = $1
       FOR SHARE`,
      [activityId]
    );

    if (activityResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Actividad no encontrada"
      });
    }

    const activity = activityResult.rows[0];

    if (activity.status !== "active") {
      await client.query("ROLLBACK");

      return res.status(409).json({
        message:
          "La actividad se encuentra inactiva y no admite respuestas"
      });
    }

    /*
     * Bloquea temporalmente la combinación usuario-actividad.
     * Evita que dos solicitudes simultáneas sumen puntos dos veces.
     */
    await client.query(
      `SELECT pg_advisory_xact_lock(
        $1::integer,
        $2::integer
      )`,
      [req.user.id, activityId]
    );

    const previousReward = await client.query(
      `SELECT EXISTS (
         SELECT 1
         FROM user_activities
         WHERE user_id = $1
           AND activity_id = $2
           AND points_awarded = TRUE
       ) AS already_rewarded`,
      [req.user.id, activityId]
    );

    const alreadyRewarded =
      previousReward.rows[0].already_rewarded;

    const shouldAwardPoints = !alreadyRewarded;

    const responseResult = await client.query(
      `INSERT INTO user_activities (
        user_id,
        activity_id,
        reflection,
        activity_status,
        observation,
        points_awarded,
        completed_at
      )
      VALUES (
        $1,
        $2,
        $3,
        'completed',
        $4,
        $5,
        CURRENT_TIMESTAMP
      )
      RETURNING
        id,
        user_id,
        activity_id,
        reflection AS response,
        activity_status,
        observation,
        points_awarded,
        completed_at`,
      [
        req.user.id,
        activityId,
        userResponse,
        observation,
        shouldAwardPoints
      ]
    );

    /*
     * Crea un progreso inicial en caso de que el usuario antiguo
     * no tenga todavía una fila en gamification.
     */
    await client.query(
      `INSERT INTO gamification (
        user_id,
        points,
        level
      )
      VALUES ($1, 0, 1)
      ON CONFLICT (user_id)
      DO NOTHING`,
      [req.user.id]
    );

    let progressResult;

    if (shouldAwardPoints) {
      progressResult = await client.query(
        `UPDATE gamification
         SET points = points + $1,
             level = FLOOR((points + $1) / 100) + 1,
             updated_at = CURRENT_TIMESTAMP
         WHERE user_id = $2
         RETURNING
           points,
           level,
           updated_at`,
        [ACTIVITY_POINTS, req.user.id]
      );

      await unlockActivityAchievement(
        client,
        req.user.id
      );

      await unlockLevelAchievement(
        client,
        req.user.id,
        progressResult.rows[0].level
      );
    } else {
      progressResult = await client.query(
        `SELECT
          points,
          level,
          updated_at
         FROM gamification
         WHERE user_id = $1`,
        [req.user.id]
      );
    }

    await client.query("COMMIT");

    return res.status(201).json({
      message: shouldAwardPoints
        ? "Actividad completada y progreso actualizado correctamente"
        : "Actividad completada nuevamente; el progreso no se duplicó",
      activity_response: responseResult.rows[0],
      points_added: shouldAwardPoints
        ? ACTIVITY_POINTS
        : 0,
      already_rewarded: alreadyRewarded,
      progress: progressResult.rows[0]
    });
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK");
    }

    console.error(
      "Error al registrar respuesta de actividad:",
      error
    );

    return res.status(500).json({
      message: "Error al registrar respuesta de actividad"
    });
  } finally {
    client?.release();
  }
}

/**
 * GET /api/activities/completed
 * Consulta el historial de respuestas del usuario autenticado.
 */
export async function getUserActivities(req, res) {
  try {
    const result = await pool.query(
      `SELECT
        ua.id,
        ua.reflection AS response,
        ua.activity_status,
        ua.observation,
        ua.points_awarded,
        ua.completed_at,
        a.id AS activity_id,
        a.title,
        a.description,
        a.category,
        a.instructions,
        a.estimated_duration,
        a.status AS activity_catalog_status
       FROM user_activities ua
       INNER JOIN activities a
         ON ua.activity_id = a.id
       WHERE ua.user_id = $1
       ORDER BY
        ua.completed_at DESC,
        ua.id DESC`,
      [req.user.id]
    );

    return res.json({
      message:
        result.rows.length > 0
          ? "Historial de actividades obtenido correctamente"
          : "El usuario todavía no ha completado actividades",
      total: result.rows.length,
      activity_responses: result.rows
    });
  } catch (error) {
    console.error(
      "Error al obtener respuestas de actividades:",
      error
    );

    return res.status(500).json({
      message: "Error al obtener respuestas de actividades"
    });
  }
}

/**
 * Desbloquea el logro de la primera actividad.
 */
async function unlockActivityAchievement(
  client,
  userId
) {
  await client.query(
    `INSERT INTO user_achievements (
      user_id,
      achievement_id
    )
    SELECT $1, id
    FROM achievements
    WHERE code = 'FIRST_ACTIVITY'
    ON CONFLICT (
      user_id,
      achievement_id
    )
    DO NOTHING`,
    [userId]
  );
}

/**
 * Desbloquea el logro de nivel 2 cuando corresponda.
 */
async function unlockLevelAchievement(
  client,
  userId,
  level
) {
  if (Number(level) < 2) {
    return;
  }

  await client.query(
    `INSERT INTO user_achievements (
      user_id,
      achievement_id
    )
    SELECT $1, id
    FROM achievements
    WHERE code = 'LEVEL_TWO'
    ON CONFLICT (
      user_id,
      achievement_id
    )
    DO NOTHING`,
    [userId]
  );
}