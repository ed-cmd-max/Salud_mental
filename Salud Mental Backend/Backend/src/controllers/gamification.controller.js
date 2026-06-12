import { pool } from "../config/db.js";

export async function getProgress(req, res) {
  try {
    const result = await pool.query(
      `SELECT points, level
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