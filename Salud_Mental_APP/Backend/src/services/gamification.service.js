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
  progress
) {
  const emotionResult = await db.query(
    `SELECT COUNT(*)::INTEGER AS total
     FROM emotions
     WHERE user_id = $1`,
    [userId]
  );

  const metrics = {
    emotion_count:
      Number(emotionResult.rows[0].total),

    activity_count:
      Number(progress.activities_completed),

    level:
      Number(progress.level),

    streak_days:
      Number(progress.streak_days),

    points:
      Number(progress.points)
  };

  const achievementsResult = await db.query(
    `SELECT
      id,
      code,
      criterion_type,
      criterion_value,
      points_required
     FROM achievements
     WHERE status = 'active'
     ORDER BY id ASC`
  );

  for (const achievement of achievementsResult.rows) {
    const unlocked = criterionIsMet(
      achievement,
      metrics
    );

    if (unlocked) {
      await unlockAchievement(
        db,
        userId,
        achievement.id
      );
    }
  }
}

function criterionIsMet(
  achievement,
  metrics
) {
  const type = achievement.criterion_type;

  let requiredValue =
    Number(achievement.criterion_value);

  if (
    type === "points" &&
    Number(achievement.points_required) > 0
  ) {
    requiredValue =
      Number(achievement.points_required);
  }

  const currentValue = Number(
    metrics[type] ?? 0
  );

  return currentValue >= requiredValue;
}

async function unlockAchievement(
  db,
  userId,
  achievementId
) {
  await db.query(
    `INSERT INTO user_achievements (
      user_id,
      achievement_id
    )
    VALUES ($1, $2)
    ON CONFLICT (
      user_id,
      achievement_id
    )
    DO NOTHING`,
    [userId, achievementId]
  );
}