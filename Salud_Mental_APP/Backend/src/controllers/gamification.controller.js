import { pool } from "../config/db.js";

/**
 * GET /api/gamification/progress
 */
export async function getProgress(req, res) {
  try {
    await pool.query(
      `INSERT INTO gamification (
        user_id,
        points,
        level,
        activities_completed,
        streak_days
      )
      VALUES ($1, 0, 1, 0, 0)
      ON CONFLICT (user_id)
      DO NOTHING`,
      [req.user.id]
    );

    const result = await pool.query(
      `SELECT
        points,
        level,
        activities_completed,
        streak_days,
        last_activity_date,
        updated_at
       FROM gamification
       WHERE user_id = $1`,
      [req.user.id]
    );

    const progress = result.rows[0];

    const points = Number(progress.points);
    const level = Number(progress.level);

    const currentLevelStart =
      (level - 1) * 100;

    const nextLevelPoints =
      level * 100;

    const pointsInCurrentLevel =
      points - currentLevelStart;

    const pointsToNextLevel =
      Math.max(nextLevelPoints - points, 0);

    const progressPercentage =
      Math.min(
        Math.round(
          (pointsInCurrentLevel / 100) * 100
        ),
        100
      );

    return res.json({
      progress: {
        ...progress,
        points_in_current_level:
          pointsInCurrentLevel,

        points_to_next_level:
          pointsToNextLevel,

        next_level_points:
          nextLevelPoints,

        progress_percentage:
          progressPercentage
      }
    });
  } catch (error) {
    console.error(
      "Error al obtener progreso:",
      error
    );

    return res.status(500).json({
      message: "Error al obtener progreso"
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
        unlocked DESC,
        a.id ASC`,
      [req.user.id]
    );

    const unlockedCount =
      result.rows.filter(
        (achievement) => achievement.unlocked
      ).length;

    return res.json({
      total: result.rows.length,
      unlocked_count: unlockedCount,
      pending_count:
        result.rows.length - unlockedCount,
      achievements: result.rows
    });
  } catch (error) {
    console.error(
      "Error al obtener logros:",
      error
    );

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
export function rejectManualProgressUpdate(
  req,
  res
) {
  return res.status(405).json({
    message:
      "El progreso se actualiza automáticamente mediante las acciones realizadas en la aplicación"
  });
}