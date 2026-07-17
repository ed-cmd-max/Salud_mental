import { pool } from "../config/db.js";

/**
 * GET /api/gamification/progress
 */
export async function getProgress(req, res) {
  try {
    const result = await pool.query(
      `SELECT
        a.id,
        a.code,
        a.title,
        a.description,
        a.criterion_type,
        a.criterion_value,
        a.points_required,
        a.status,

        CASE
          WHEN ua.id IS NULL THEN FALSE
          ELSE TRUE
        END AS unlocked,

        ua.unlocked_at

       FROM achievements a

       LEFT JOIN user_achievements ua
         ON a.id = ua.achievement_id
        AND ua.user_id = $1

       WHERE
         a.status = 'active'
         OR ua.id IS NOT NULL

       ORDER BY
         CASE
           WHEN ua.id IS NULL THEN 1
           ELSE 0
         END,
         a.id ASC`,
      [req.user.id]
    );

    const unlockedCount = result.rows.filter(
      (achievement) => achievement.unlocked
    ).length;

    return res.json({
      total: result.rows.length,
      unlocked_count: unlockedCount,
      pending_count: result.rows.length - unlockedCount,
      achievements: result.rows
    });
  } catch (error) {
    console.error("Error al obtener progreso:", error);

    return res.status(500).json({
      message: "Error al obtener el progreso"
    });
  }
}

/**
 * GET /api/gamification/achievements
 */
export async function getAchievements(req, res) {
  try {
    const result = await pool.query(
      `SELECT
        a.id,
        a.code,
        a.title,
        a.description,

        CASE
          WHEN ua.id IS NULL THEN FALSE
          ELSE TRUE
        END AS unlocked,

        ua.unlocked_at

       FROM achievements a

       LEFT JOIN user_achievements ua
         ON a.id = ua.achievement_id
        AND ua.user_id = $1

       ORDER BY
         CASE
           WHEN ua.id IS NULL THEN 1
           ELSE 0
         END,
         a.id ASC`,
      [req.user.id]
    );

    const unlockedCount = result.rows.filter(
      (achievement) => achievement.unlocked
    ).length;

    return res.json({
      total: result.rows.length,
      unlocked_count: unlockedCount,
      pending_count: result.rows.length - unlockedCount,
      achievements: result.rows
    });
  } catch (error) {
    console.error("Error al obtener logros:", error);

    return res.status(500).json({
      message: "Error al obtener logros"
    });
  }
}

/**
 * PATCH /api/gamification/progress
 *
 * El frontend no puede cambiar puntos, nivel,
 * racha ni actividades completadas.
 */
export function rejectManualProgressUpdate(req, res) {
  return res.status(405).json({
    message:
      "El progreso se actualiza automáticamente mediante las acciones realizadas en la aplicación"
  });
}