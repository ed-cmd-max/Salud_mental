import { pool } from "../config/db.js";

export async function getProgress(req, res) {
  try {
    const result = await pool.query(
      `SELECT points, level, updated_at
       FROM gamification
       WHERE user_id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Progreso no encontrado"
      });
    }

    res.json({
      progress: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener progreso",
      error: error.message
    });
  }
}

export async function updateProgress(req, res) {
  try {
    const { points, level, points_to_add } = req.body;

    const currentProgress = await pool.query(
      `SELECT points, level
       FROM gamification
       WHERE user_id = $1`,
      [req.user.id]
    );

    if (currentProgress.rows.length === 0) {
      return res.status(404).json({
        message: "Progreso no encontrado"
      });
    }

    const current = currentProgress.rows[0];

    const hasDirectPoints = points !== undefined;
    const hasPointsToAdd = points_to_add !== undefined;
    const hasDirectLevel = level !== undefined;

    if (!hasDirectPoints && !hasPointsToAdd && !hasDirectLevel) {
      return res.status(400).json({
        message: "Debe enviar points, points_to_add o level para actualizar el progreso"
      });
    }

    let newPoints = Number(current.points);

    if (hasDirectPoints) {
      newPoints = Number(points);
    }

    if (hasPointsToAdd) {
      newPoints += Number(points_to_add);
    }

    if (Number.isNaN(newPoints) || newPoints < 0) {
      return res.status(400).json({
        message: "Los puntos deben ser un número mayor o igual a 0"
      });
    }

    let newLevel = hasDirectLevel
      ? Number(level)
      : Math.floor(newPoints / 100) + 1;

    if (Number.isNaN(newLevel) || newLevel < 1) {
      return res.status(400).json({
        message: "El nivel debe ser un número mayor o igual a 1"
      });
    }

    const result = await pool.query(
      `UPDATE gamification
       SET points = $1,
           level = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $3
       RETURNING points, level, updated_at`,
      [newPoints, newLevel, req.user.id]
    );

    await unlockLevelAchievement(req.user.id, newLevel);

    res.json({
      message: "Progreso actualizado correctamente",
      progress: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al actualizar progreso",
      error: error.message
    });
  }
}

export async function getAchievements(req, res) {
  try {
    const result = await pool.query(
      `SELECT a.id, a.code, a.title, a.description,
              CASE
                WHEN ua.id IS NULL THEN false
                ELSE true
              END AS unlocked,
              ua.unlocked_at
       FROM achievements a
       LEFT JOIN user_achievements ua
       ON a.id = ua.achievement_id AND ua.user_id = $1
       ORDER BY a.id ASC`,
      [req.user.id]
    );

    res.json({
      achievements: result.rows
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener logros",
      error: error.message
    });
  }
}

async function unlockLevelAchievement(userId, level) {
  if (level < 2) return;

  const achievement = await pool.query(
    "SELECT id FROM achievements WHERE code = $1",
    ["LEVEL_TWO"]
  );

  if (achievement.rows.length === 0) return;

  const achievementId = achievement.rows[0].id;

  const exists = await pool.query(
    `SELECT id
     FROM user_achievements
     WHERE user_id = $1 AND achievement_id = $2`,
    [userId, achievementId]
  );

  if (exists.rows.length === 0) {
    await pool.query(
      `INSERT INTO user_achievements (user_id, achievement_id)
       VALUES ($1, $2)`,
      [userId, achievementId]
    );
  }
}