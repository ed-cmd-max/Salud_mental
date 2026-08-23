import { pool } from "../config/db.js";

import {
  applyGamificationEvent
} from "../services/gamification.service.js";

const MAX_RESPONSE_LENGTH = 2000;
const MAX_OBSERVATION_LENGTH = 500;

function parsePositiveId(value) {
  const id = Number(value);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    return null;
  }

  return id;
}

function normalizeOptionalText(
  value
) {
  if (
    value === undefined ||
    value === null
  ) {
    return null;
  }

  const text =
    String(value).trim();

  return text === ""
    ? null
    : text;
}

/**
 * GET /api/activities
 */
export async function getActivities(
  req,
  res
) {
  try {
    const result =
      await pool.query(
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
          ? "Actividades de autocuidado y autorreflexión obtenidas correctamente"
          : "No existen actividades de autocuidado y autorreflexión disponibles",

      total:
        result.rows.length,

      activities:
        result.rows
    });
  } catch (error) {
    console.error(
      "Error al obtener actividades:",
      error
    );

    return res
      .status(500)
      .json({
        message:
          "Error al obtener actividades"
      });
  }
}

/**
 * GET /api/activities/:id
 */
export async function getActivityById(
  req,
  res
) {
  try {
    const activityId =
      parsePositiveId(
        req.params.id
      );

    if (!activityId) {
      return res
        .status(400)
        .json({
          message:
            "El identificador de la actividad no es válido"
        });
    }

    const result =
      await pool.query(
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

    if (
      result.rows.length === 0
    ) {
      return res
        .status(404)
        .json({
          message:
            "Actividad no encontrada o no disponible"
        });
    }

    return res.json({
      activity:
        result.rows[0]
    });
  } catch (error) {
    console.error(
      "Error al obtener actividad:",
      error
    );

    return res
      .status(500)
      .json({
        message:
          "Error al obtener actividad"
      });
  }
}

/**
 * POST /api/activities/:id/responses
 */
export async function saveActivityResponse(
  req,
  res
) {
  let client;

  try {
    const activityId =
      parsePositiveId(
        req.params.id
      );

    if (!activityId) {
      return res
        .status(400)
        .json({
          message:
            "El identificador de la actividad no es válido"
        });
    }

    const responseValue =
      req.body.response ??
      req.body.response_usuario ??
      req.body.reflection;

    const userResponse =
      normalizeOptionalText(
        responseValue
      );

    const observation =
      normalizeOptionalText(
        req.body.observation ??
          req.body.observacion
      );

    if (!userResponse) {
      return res
        .status(400)
        .json({
          message:
            "La respuesta de la actividad es obligatoria"
        });
    }

    if (
      userResponse.length >
      MAX_RESPONSE_LENGTH
    ) {
      return res
        .status(400)
        .json({
          message:
            `La respuesta no puede superar los ` +
            `${MAX_RESPONSE_LENGTH} caracteres`
        });
    }

    if (
      observation &&
      observation.length >
        MAX_OBSERVATION_LENGTH
    ) {
      return res
        .status(400)
        .json({
          message:
            `La observación no puede superar los ` +
            `${MAX_OBSERVATION_LENGTH} caracteres`
        });
    }

    client =
      await pool.connect();

    await client.query(
      "BEGIN"
    );

    /*
     * Comprueba que la actividad exista
     * y continúe activa.
     */
    const activityResult =
      await client.query(
        `SELECT
          id,
          title,
          status
         FROM activities
         WHERE id = $1
         FOR SHARE`,
        [activityId]
      );

    if (
      activityResult.rows.length ===
      0
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res
        .status(404)
        .json({
          message:
            "Actividad no encontrada"
        });
    }

    const activity =
      activityResult.rows[0];

    if (
      activity.status !==
      "active"
    ) {
      await client.query(
        "ROLLBACK"
      );

      return res
        .status(409)
        .json({
          message:
            "La actividad se encuentra inactiva y no admite respuestas"
        });
    }

    /*
     * Evita que dos solicitudes
     * simultáneas otorguen puntos
     * por la misma actividad.
     */
    await client.query(
      `SELECT pg_advisory_xact_lock(
        $1::integer,
        $2::integer
      )`,
      [
        req.user.id,
        activityId
      ]
    );

    /*
     * Comprueba si el usuario ya había
     * recibido puntos anteriormente por
     * esta misma actividad.
     */
    const previousReward =
      await client.query(
        `SELECT EXISTS (
           SELECT 1
           FROM user_activities
           WHERE user_id = $1
             AND activity_id = $2
             AND points_awarded = TRUE
         ) AS already_rewarded`,
        [
          req.user.id,
          activityId
        ]
      );

    const alreadyRewarded =
      previousReward.rows[0]
        .already_rewarded;

    const shouldAwardPoints =
      !alreadyRewarded;

    /*
     * Guarda la respuesta del usuario.
     */
    const responseResult =
      await client.query(
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
     * Actualiza la gamificación.
     *
     * Si la actividad ya fue premiada
     * anteriormente, no vuelve a sumar
     * puntos ni actividades completadas.
     *
     * El servicio también devuelve los
     * logros que fueron desbloqueados
     * específicamente en esta acción.
     */
    const gamificationResult =
      await applyGamificationEvent(
        client,
        {
          userId:
            req.user.id,

          eventType:
            "ACTIVITY_COMPLETED",

          awardPoints:
            shouldAwardPoints
        }
      );

    await client.query(
      "COMMIT"
    );

    /*
     * Devuelve también los logros
     * recién desbloqueados para que
     * el frontend pueda mostrar las
     * notificaciones correspondientes.
     */
    return res.status(201).json({
      message:
        shouldAwardPoints
          ? "Actividad completada y progreso actualizado correctamente"
          : "Actividad completada nuevamente; el progreso no se duplicó",

      activity_response:
        responseResult.rows[0],

      points_added:
        gamificationResult
          .points_added,

      already_rewarded:
        alreadyRewarded,

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
      "Error al registrar respuesta de actividad:",
      error
    );

    return res
      .status(500)
      .json({
        message:
          "Error al registrar respuesta de actividad"
      });
  } finally {
    client?.release();
  }
}

/**
 * GET /api/activities/completed
 */
export async function getUserActivities(
  req,
  res
) {
  try {
    const result =
      await pool.query(
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

      total:
        result.rows.length,

      activity_responses:
        result.rows
    });
  } catch (error) {
    console.error(
      "Error al obtener respuestas de actividades:",
      error
    );

    return res
      .status(500)
      .json({
        message:
          "Error al obtener respuestas de actividades"
      });
  }
}