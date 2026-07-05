import { pool } from "../config/db.js";

export async function getActivities(req, res) {
  try {
    const result = await pool.query(
      "SELECT * FROM activities ORDER BY id ASC"
    );

    res.json({
      activities: result.rows
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener actividades",
      error: error.message
    });
  }
}

export async function getActivityById(req, res) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "SELECT * FROM activities WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Actividad no encontrada"
      });
    }

    res.json({
      activity: result.rows[0]
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener actividad",
      error: error.message
    });
  }
}

export async function saveActivityResponse(req, res) {
  try {
    const { id } = req.params;
    const { response, response_usuario, reflection } = req.body;

    const userResponse = response || response_usuario || reflection;

    if (!userResponse || userResponse.trim() === "") {
      return res.status(400).json({
        message: "La respuesta de la actividad es obligatoria"
      });
    }

    const activity = await pool.query(
      "SELECT * FROM activities WHERE id = $1",
      [id]
    );

    if (activity.rows.length === 0) {
      return res.status(404).json({
        message: "Actividad no encontrada"
      });
    }

    const result = await pool.query(
      `INSERT INTO user_activities (user_id, activity_id, reflection)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.user.id, id, userResponse]
    );

    await pool.query(
      `UPDATE gamification
       SET points = points + 20,
           level = FLOOR((points + 20) / 100) + 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1`,
      [req.user.id]
    );

    await unlockActivityAchievement(req.user.id);

    res.status(201).json({
      message: "Respuesta de actividad registrada correctamente",
      activity_response: result.rows[0],
      points_added: 20
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al registrar respuesta de actividad",
      error: error.message
    });
  }
}

export async function getUserActivities(req, res) {
  try {
    const result = await pool.query(
      `SELECT ua.id, ua.reflection AS response, ua.completed_at,
              a.id AS activity_id, a.title, a.description, a.category
       FROM user_activities ua
       INNER JOIN activities a ON ua.activity_id = a.id
       WHERE ua.user_id = $1
       ORDER BY ua.completed_at DESC`,
      [req.user.id]
    );

    res.json({
      activity_responses: result.rows
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener respuestas de actividades",
      error: error.message
    });
  }
}

async function unlockActivityAchievement(userId) {
  const achievement = await pool.query(
    "SELECT id FROM achievements WHERE code = $1",
    ["FIRST_ACTIVITY"]
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