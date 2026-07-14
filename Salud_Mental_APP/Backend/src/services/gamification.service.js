const EVENT_TYPES = {
  EMOTION_REGISTERED: {
    points: 10,
    activitiesCompleted: 0
  },

  ACTIVITY_COMPLETED: {
    points: 20,
    activitiesCompleted: 1
  }
};

/**
 * Actualiza automáticamente el progreso del usuario.
 *
 * El parámetro db puede ser:
 * - pool, cuando no existe una transacción;
 * - client, cuando la operación está dentro de una transacción.
 */
export async function applyGamificationEvent(
  db,
  {
    userId,
    eventType,
    awardPoints = true
  }
) {
  const config = EVENT_TYPES[eventType];

  if (!config) {
    throw new Error(
      `Tipo de evento de gamificación no válido: ${eventType}`
    );
  }

  const pointsAdded = awardPoints
    ? config.points
    : 0;

  const activitiesAdded = awardPoints
    ? config.activitiesCompleted
    : 0;

  await db.query(
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
    [userId]
  );

  /*
   * La racha utiliza CURRENT_DATE, es decir, la fecha real
   * de uso de la aplicación.
   *
   * No utiliza record_date porque el usuario podría registrar
   * una emoción de una fecha anterior y alterar artificialmente
   * su racha.
   */
  const progressResult = await db.query(
    `UPDATE gamification
     SET
       points = points + $1,

       level = ((points + $1) / 100) + 1,

       activities_completed =
         activities_completed + $2,

       streak_days = CASE
         WHEN last_activity_date IS NULL
           THEN 1

         WHEN last_activity_date = CURRENT_DATE
           THEN streak_days

         WHEN last_activity_date = CURRENT_DATE - 1
           THEN streak_days + 1

         ELSE 1
       END,

       last_activity_date = CURRENT_DATE,

       updated_at = CURRENT_TIMESTAMP

     WHERE user_id = $3

     RETURNING
       points,
       level,
       activities_completed,
       streak_days,
       last_activity_date,
       updated_at`,
    [
      pointsAdded,
      activitiesAdded,
      userId
    ]
  );

  const progress = progressResult.rows[0];

  await evaluateAchievements(
    db,
    userId,
    eventType,
    progress
  );

  return {
    points_added: pointsAdded,
    progress
  };
}

async function evaluateAchievements(
  db,
  userId,
  eventType,
  progress
) {
  if (eventType === "EMOTION_REGISTERED") {
    const emotionCountResult = await db.query(
      `SELECT COUNT(*)::INTEGER AS total
       FROM emotions
       WHERE user_id = $1`,
      [userId]
    );

    const totalEmotions =
      emotionCountResult.rows[0].total;

    if (totalEmotions >= 1) {
      await unlockAchievement(
        db,
        userId,
        "FIRST_EMOTION"
      );
    }

    if (totalEmotions >= 5) {
      await unlockAchievement(
        db,
        userId,
        "FIVE_EMOTIONS"
      );
    }
  }

  if (
    eventType === "ACTIVITY_COMPLETED" &&
    Number(progress.activities_completed) >= 1
  ) {
    await unlockAchievement(
      db,
      userId,
      "FIRST_ACTIVITY"
    );
  }

  if (Number(progress.activities_completed) >= 3) {
    await unlockAchievement(
      db,
      userId,
      "THREE_ACTIVITIES"
    );
  }

  if (Number(progress.level) >= 2) {
    await unlockAchievement(
      db,
      userId,
      "LEVEL_TWO"
    );
  }

  if (Number(progress.streak_days) >= 3) {
    await unlockAchievement(
      db,
      userId,
      "THREE_DAY_STREAK"
    );
  }
}

async function unlockAchievement(
  db,
  userId,
  code
) {
  await db.query(
    `INSERT INTO user_achievements (
      user_id,
      achievement_id
    )
    SELECT
      $1,
      id
    FROM achievements
    WHERE code = $2
    ON CONFLICT (
      user_id,
      achievement_id
    )
    DO NOTHING`,
    [userId, code]
  );
}