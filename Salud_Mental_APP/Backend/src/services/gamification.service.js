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
 * Actualiza automáticamente el progreso
 * y devuelve los logros desbloqueados
 * específicamente durante este evento.
 */
export async function applyGamificationEvent(
  db,
  {
    userId,
    eventType,
    awardPoints = true
  }
) {
  const config =
    EVENT_TYPES[eventType];

  if (!config) {
    throw new Error(
      `Tipo de evento de gamificación no válido: ${eventType}`
    );
  }

  const pointsAdded =
    awardPoints
      ? config.points
      : 0;

  const activitiesAdded =
    awardPoints
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

  const progressResult =
    await db.query(
      `UPDATE gamification
       SET
         points =
           points + $1,

         level =
           ((points + $1) / 100) + 1,

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

         last_activity_date =
           CURRENT_DATE,

         updated_at =
           CURRENT_TIMESTAMP

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

  const progress =
    progressResult.rows[0];

  const unlockedAchievements =
    await evaluateAchievements(
      db,
      userId,
      progress
    );

  return {
    points_added:
      pointsAdded,

    progress,

    unlocked_achievements:
      unlockedAchievements
  };
}

/**
 * Evalúa todos los logros activos.
 *
 * Devuelve únicamente los logros que
 * fueron desbloqueados EN ESTE EVENTO.
 */
async function evaluateAchievements(
  db,
  userId,
  progress
) {
  const emotionResult =
    await db.query(
      `SELECT
        COUNT(*)::INTEGER AS total
       FROM emotions
       WHERE user_id = $1`,
      [userId]
    );

  const metrics = {
    emotion_count:
      Number(
        emotionResult.rows[0].total
      ),

    activity_count:
      Number(
        progress.activities_completed
      ),

    level:
      Number(
        progress.level
      ),

    streak_days:
      Number(
        progress.streak_days
      ),

    points:
      Number(
        progress.points
      )
  };

  const achievementsResult =
    await db.query(
      `SELECT
        id,
        code,
        title,
        description,
        criterion_type,
        criterion_value,
        points_required
       FROM achievements
       WHERE status = 'active'
       ORDER BY id ASC`
    );

  const unlockedAchievements =
    [];

  for (
    const achievement
    of achievementsResult.rows
  ) {
    const criterionMet =
      criterionIsMet(
        achievement,
        metrics
      );

    if (!criterionMet) {
      continue;
    }

    /*
     * unlockAchievement devuelve true
     * solamente si el INSERT ocurrió
     * ahora.
     *
     * Si el usuario ya tenía el logro,
     * devuelve false.
     */
    const unlockedNow =
      await unlockAchievement(
        db,
        userId,
        achievement.id
      );

    if (unlockedNow) {
      unlockedAchievements.push({
        id:
          achievement.id,

        code:
          achievement.code,

        title:
          achievement.title,

        description:
          achievement.description,

        criterion_type:
          achievement.criterion_type
      });
    }
  }

  return unlockedAchievements;
}

function criterionIsMet(
  achievement,
  metrics
) {
  const type =
    achievement.criterion_type;

  let requiredValue =
    Number(
      achievement.criterion_value
    );

  if (
    type === "points" &&
    Number(
      achievement.points_required
    ) > 0
  ) {
    requiredValue =
      Number(
        achievement.points_required
      );
  }

  const currentValue =
    Number(
      metrics[type] ?? 0
    );

  return (
    currentValue >=
    requiredValue
  );
}

/**
 * Intenta desbloquear el logro.
 *
 * true:
 * el logro acaba de desbloquearse.
 *
 * false:
 * el usuario ya tenía ese logro.
 */
async function unlockAchievement(
  db,
  userId,
  achievementId
) {
  const result =
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
      DO NOTHING

      RETURNING
        achievement_id`,
      [
        userId,
        achievementId
      ]
    );

  return (
    result.rowCount > 0
  );
}