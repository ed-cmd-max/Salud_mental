import { pool } from "../config/db.js";

export async function createEmotion(req, res) {
  try {
    const { mood, emotion, intensity, note, description } = req.body;

    const selectedMood = mood || emotion;
    const selectedNote = note || description || null;

    if (!selectedMood || intensity === undefined) {
      return res.status(400).json({
        message: "La emoción y la intensidad son obligatorias"
      });
    }

    const numericIntensity = Number(intensity);

    if (
      Number.isNaN(numericIntensity) ||
      numericIntensity < 1 ||
      numericIntensity > 10
    ) {
      return res.status(400).json({
        message: "La intensidad debe estar entre 1 y 10"
      });
    }

    const result = await pool.query(
      `INSERT INTO emotions (user_id, mood, intensity, note)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.user.id, selectedMood, numericIntensity, selectedNote]
    );

    await pool.query(
      `UPDATE gamification
       SET points = points + 10,
           level = FLOOR((points + 10) / 100) + 1,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1`,
      [req.user.id]
    );

    await unlockAchievements(req.user.id);

    res.status(201).json({
      message: "Estado emocional registrado correctamente",
      emotion: result.rows[0],
      points_added: 10
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al registrar emoción",
      error: error.message
    });
  }
}

export async function getEmotions(req, res) {
  try {
    const result = await pool.query(
      `SELECT *
       FROM emotions
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    res.json({
      emotions: result.rows
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener emociones",
      error: error.message
    });
  }
}

export async function getEmotionHistory(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, user_id, mood, intensity, note, created_at,
              TO_CHAR(created_at, 'YYYY-MM-DD') AS record_date
       FROM emotions
       WHERE user_id = $1
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    const history = result.rows.reduce((acc, item) => {
      const date = item.record_date;

      if (!acc[date]) {
        acc[date] = [];
      }

      acc[date].push({
        id: item.id,
        user_id: item.user_id,
        mood: item.mood,
        intensity: item.intensity,
        note: item.note,
        created_at: item.created_at
      });

      return acc;
    }, {});

    res.json({
      message: "Historial emocional obtenido correctamente",
      history
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener historial emocional",
      error: error.message
    });
  }
}

export async function getEmotionStats(req, res) {
  try {
    const result = await pool.query(
      `SELECT mood, intensity
       FROM emotions
       WHERE user_id = $1`,
      [req.user.id]
    );

    const records = result.rows;

    if (records.length === 0) {
      return res.json({
        total_records: 0,
        average_intensity: 0,
        most_frequent_mood: null,
        mood_count: {}
      });
    }

    const totalIntensity = records.reduce(
      (sum, item) => sum + item.intensity,
      0
    );

    const averageIntensity = totalIntensity / records.length;

    const moodCount = {};

    records.forEach((item) => {
      moodCount[item.mood] = (moodCount[item.mood] || 0) + 1;
    });

    const mostFrequentMood = Object.entries(moodCount)
      .sort((a, b) => b[1] - a[1])[0][0];

    res.json({
      total_records: records.length,
      average_intensity: Number(averageIntensity.toFixed(2)),
      most_frequent_mood: mostFrequentMood,
      mood_count: moodCount
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al obtener estadísticas",
      error: error.message
    });
  }
}

export async function deleteEmotion(req, res) {
  try {
    const { id } = req.params;

    const exists = await pool.query(
      `SELECT *
       FROM emotions
       WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    if (exists.rows.length === 0) {
      return res.status(404).json({
        message: "Registro emocional no encontrado"
      });
    }

    await pool.query(
      `DELETE FROM emotions
       WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );

    res.json({
      message: "Registro emocional eliminado correctamente"
    });
  } catch (error) {
    res.status(500).json({
      message: "Error al eliminar emoción",
      error: error.message
    });
  }
}

async function unlockAchievements(userId) {
  const emotionCount = await pool.query(
    "SELECT COUNT(*) FROM emotions WHERE user_id = $1",
    [userId]
  );

  const totalEmotions = Number(emotionCount.rows[0].count);

  if (totalEmotions >= 1) {
    await insertAchievement(userId, "FIRST_EMOTION");
  }

  if (totalEmotions >= 5) {
    await insertAchievement(userId, "FIVE_EMOTIONS");
  }

  const progress = await pool.query(
    "SELECT level FROM gamification WHERE user_id = $1",
    [userId]
  );

  if (progress.rows.length > 0 && progress.rows[0].level >= 2) {
    await insertAchievement(userId, "LEVEL_TWO");
  }
}

async function insertAchievement(userId, code) {
  const achievement = await pool.query(
    "SELECT id FROM achievements WHERE code = $1",
    [code]
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