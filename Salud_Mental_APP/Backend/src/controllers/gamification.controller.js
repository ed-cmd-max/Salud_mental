import { pool } from "../config/db.js";

/**
 * GET /api/gamification/progress
 */
export async function getProgress(req, res) {
  try {
    /*
     * Garantiza que todos los usuarios tengan
     * una fila de progreso.
     */
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

    if (result.rows.length === 0) {
      return res.status(404).json({
        message:
          "No se encontró el progreso del usuario"
      });
    }

    const databaseProgress =
      result.rows[0];

    const points =
      Number(databaseProgress.points);

    const level =
      Number(databaseProgress.level);

    const currentLevelStart =
      (level - 1) * 100;

    const nextLevelPoints =
      level * 100;

    const pointsInCurrentLevel =
      Math.max(
        points - currentLevelStart,
        0
      );

    const pointsToNextLevel =
      Math.max(
        nextLevelPoints - points,
        0
      );

    const progressPercentage =
      Math.min(
        Math.max(
          Math.round(
            (
              pointsInCurrentLevel /
              100
            ) * 100
          ),
          0
        ),
        100
      );

    return res.json({
      progress: {
        points,
        level,

        activities_completed:
          Number(
            databaseProgress
              .activities_completed
          ),

        streak_days:
          Number(
            databaseProgress
              .streak_days
          ),

        last_activity_date:
          databaseProgress
            .last_activity_date,

        updated_at:
          databaseProgress.updated_at,

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
      message:
        "Error al obtener progreso"
    });
  }
}

/**
 * GET /api/gamification/achievements
 *
 * Devuelve únicamente los logros activos.
 * También indica cuáles fueron desbloqueados
 * por el usuario autenticado.
 */
export async function getAchievements(req, res) {
  try {
    const userId = req.user.id;

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
          WHEN ua.id IS NOT NULL
          THEN true
          ELSE false
        END AS unlocked,

        ua.unlocked_at

       FROM achievements a

       LEFT JOIN user_achievements ua
         ON ua.achievement_id = a.id
        AND ua.user_id = $1

       WHERE a.status = 'active'

       ORDER BY
         CASE
           WHEN ua.id IS NOT NULL
           THEN 0
           ELSE 1
         END,
         a.id ASC`,
      [userId]
    );

    const achievements =
      result.rows.map((achievement) => ({
        ...achievement,

        id:
          Number(achievement.id),

        criterion_value:
          Number(
            achievement.criterion_value
          ),

        points_required:
          Number(
            achievement.points_required
          ),

        unlocked:
          achievement.unlocked === true
      }));

    const unlockedCount =
      achievements.filter(
        (achievement) =>
          achievement.unlocked
      ).length;

    const total =
      achievements.length;

    return res.json({
      total,

      unlocked_count:
        unlockedCount,

      pending_count:
        total - unlockedCount,

      achievements
    });
  } catch (error) {
    console.error(
      "Error al consultar logros:",
      error
    );

    return res.status(500).json({
      message:
        "Error al consultar los logros"
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