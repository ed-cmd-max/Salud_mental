import { pool } from "../config/db.js";

function parsePositiveId(value) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

/**
 * GET /api/admin/users
 * Consulta usuarios sin exponer contraseñas.
 */
export async function getUsers(req, res) {
  try {
    const result = await pool.query(
      `SELECT
        id,
        name,
        email,
        role,
        account_status,
        created_at
       FROM users
       ORDER BY created_at DESC, id DESC`
    );

    return res.json({
      message:
        result.rows.length > 0
          ? "Usuarios obtenidos correctamente"
          : "No existen usuarios registrados",
      total: result.rows.length,
      users: result.rows
    });
  } catch (error) {
    console.error(
      "Error al consultar usuarios:",
      error
    );

    return res.status(500).json({
      message: "Error al consultar usuarios"
    });
  }
}

/**
 * PATCH /api/admin/users/:id/status
 * Activa o desactiva una cuenta.
 */
export async function updateUserStatus(req, res) {
  try {
    const userId = parsePositiveId(req.params.id);

    if (!userId) {
      return res.status(400).json({
        message: "El identificador del usuario no es válido"
      });
    }

    const accountStatus = String(
      req.body.account_status ??
      req.body.status ??
      ""
    )
      .trim()
      .toLowerCase();

    if (
      !["active", "inactive"].includes(accountStatus)
    ) {
      return res.status(400).json({
        message:
          "El estado de la cuenta debe ser active o inactive"
      });
    }

    if (
      userId === req.user.id &&
      accountStatus === "inactive"
    ) {
      return res.status(400).json({
        message:
          "El administrador no puede desactivar su propia cuenta"
      });
    }

    const userResult = await pool.query(
      `SELECT
        id,
        name,
        email,
        role,
        account_status
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        message: "Usuario no encontrado"
      });
    }

    const currentUser = userResult.rows[0];

    if (
      currentUser.account_status === accountStatus
    ) {
      return res.json({
        message:
          "La cuenta ya posee el estado solicitado",
        user: currentUser
      });
    }

    const result = await pool.query(
      `UPDATE users
       SET account_status = $1
       WHERE id = $2
       RETURNING
        id,
        name,
        email,
        role,
        account_status,
        created_at`,
      [accountStatus, userId]
    );

    return res.json({
      message:
        accountStatus === "active"
          ? "Cuenta activada correctamente"
          : "Cuenta desactivada correctamente",
      user: result.rows[0]
    });
  } catch (error) {
    console.error(
      "Error al actualizar estado de usuario:",
      error
    );

    return res.status(500).json({
      message:
        "Error al actualizar el estado del usuario"
    });
  }
}

/**
 * PATCH /api/admin/users/:id/role
 * Cambia el rol entre user y admin.
 */
export async function updateUserRole(req, res) {
  let client;

  try {
    const userId = parsePositiveId(req.params.id);

    if (!userId) {
      return res.status(400).json({
        message: "El identificador del usuario no es válido"
      });
    }

    const role = String(
      req.body.role ?? ""
    )
      .trim()
      .toLowerCase();

    if (!["user", "admin"].includes(role)) {
      return res.status(400).json({
        message:
          "El rol debe ser user o admin"
      });
    }

    if (
      userId === req.user.id &&
      role === "user"
    ) {
      return res.status(400).json({
        message:
          "El administrador no puede retirar su propio rol administrativo"
      });
    }

    client = await pool.connect();
    await client.query("BEGIN");

    const userResult = await client.query(
      `SELECT
        id,
        name,
        email,
        role,
        account_status
       FROM users
       WHERE id = $1
       FOR UPDATE`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Usuario no encontrado"
      });
    }

    const currentUser = userResult.rows[0];

    if (currentUser.role === role) {
      await client.query("ROLLBACK");

      return res.json({
        message:
          "El usuario ya posee el rol solicitado",
        user: currentUser
      });
    }

    if (
      currentUser.role === "admin" &&
      role === "user"
    ) {
      const adminCountResult =
        await client.query(
          `SELECT COUNT(*)::INTEGER AS total
           FROM users
           WHERE role = 'admin'
             AND account_status = 'active'`
        );

      const adminCount =
        adminCountResult.rows[0].total;

      if (adminCount <= 1) {
        await client.query("ROLLBACK");

        return res.status(409).json({
          message:
            "No se puede retirar el rol al único administrador activo"
        });
      }
    }

    const result = await client.query(
      `UPDATE users
       SET role = $1
       WHERE id = $2
       RETURNING
        id,
        name,
        email,
        role,
        account_status,
        created_at`,
      [role, userId]
    );

    await client.query("COMMIT");

    return res.json({
      message:
        role === "admin"
          ? "Rol de administrador asignado correctamente"
          : "Rol de usuario asignado correctamente",
      user: result.rows[0]
    });
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error(
          "Error al revertir la transacción:",
          rollbackError
        );
      }
    }

    console.error(
      "Error al actualizar rol:",
      error
    );

    return res.status(500).json({
      message: "Error al actualizar el rol"
    });
  } finally {
    client?.release();
  }
}

/**
 * Obtiene un valor enviado con nombre en inglés o español.
 */
function getActivityField(body, englishName, spanishName) {
  return body[englishName] ?? body[spanishName];
}

/**
 * Prepara y valida los datos de una actividad.
 *
 * currentActivity se utiliza al editar para conservar
 * los campos que no hayan sido enviados.
 */
function prepareActivityData(body, currentActivity = null) {
  const rawTitle = getActivityField(
    body,
    "title",
    "titulo"
  );

  const rawDescription = getActivityField(
    body,
    "description",
    "descripcion"
  );

  const rawCategory = getActivityField(
    body,
    "category",
    "tipo_actividad"
  );

  const rawInstructions = getActivityField(
    body,
    "instructions",
    "instrucciones"
  );

  const rawDuration = getActivityField(
    body,
    "estimated_duration",
    "duracion_estimada"
  );

  const rawStatus = getActivityField(
    body,
    "status",
    "estado"
  );

  const title = String(
    rawTitle ?? currentActivity?.title ?? ""
  ).trim();

  const description = String(
    rawDescription ??
    currentActivity?.description ??
    ""
  ).trim();

  const category = String(
    rawCategory ??
    currentActivity?.category ??
    ""
  ).trim();

  const instructions = String(
    rawInstructions ??
    currentActivity?.instructions ??
    ""
  ).trim();

  const durationValue =
    rawDuration ??
    currentActivity?.estimated_duration;

  const estimatedDuration =
    Number(durationValue);

  const status = String(
    rawStatus ??
    currentActivity?.status ??
    "active"
  )
    .trim()
    .toLowerCase();

  if (!title) {
    return {
      error: "El título de la actividad es obligatorio"
    };
  }

  if (title.length > 150) {
    return {
      error:
        "El título no puede superar los 150 caracteres"
    };
  }

  if (!description) {
    return {
      error:
        "La descripción de la actividad es obligatoria"
    };
  }

  if (!category) {
    return {
      error:
        "El tipo o categoría de la actividad es obligatorio"
    };
  }

  if (category.length > 100) {
    return {
      error:
        "La categoría no puede superar los 100 caracteres"
    };
  }

  if (!instructions) {
    return {
      error:
        "Las instrucciones de la actividad son obligatorias"
    };
  }

  if (
    !Number.isInteger(estimatedDuration) ||
    estimatedDuration < 1 ||
    estimatedDuration > 180
  ) {
    return {
      error:
        "La duración estimada debe ser un número entero entre 1 y 180 minutos"
    };
  }

  if (!["active", "inactive"].includes(status)) {
    return {
      error:
        "El estado de la actividad debe ser active o inactive"
    };
  }

  return {
    data: {
      title,
      description,
      category,
      instructions,
      estimatedDuration,
      status
    }
  };
}

/**
 * GET /api/admin/activities
 *
 * El administrador visualiza actividades activas e inactivas.
 */
export async function getAdminActivities(req, res) {
  try {
    const result = await pool.query(
      `SELECT
        id,
        title,
        description,
        category,
        instructions,
        estimated_duration,
        status,
        created_at
       FROM activities
       ORDER BY
        created_at DESC,
        id DESC`
    );

    const activeCount = result.rows.filter(
      (activity) => activity.status === "active"
    ).length;

    return res.json({
      message:
        result.rows.length > 0
          ? "Actividades obtenidas correctamente"
          : "No existen actividades registradas",

      total: result.rows.length,

      active_count: activeCount,

      inactive_count:
        result.rows.length - activeCount,

      activities: result.rows
    });
  } catch (error) {
    console.error(
      "Error al consultar actividades administrativas:",
      error
    );

    return res.status(500).json({
      message: "Error al consultar actividades"
    });
  }
}

/**
 * POST /api/admin/activities
 *
 * Crea una nueva actividad terapéutica.
 */
export async function createAdminActivity(req, res) {
  try {
    const validation = prepareActivityData(
      req.body
    );

    if (validation.error) {
      return res.status(400).json({
        message: validation.error
      });
    }

    const {
      title,
      description,
      category,
      instructions,
      estimatedDuration,
      status
    } = validation.data;

    const duplicateResult = await pool.query(
      `SELECT id
       FROM activities
       WHERE LOWER(TRIM(title)) =
             LOWER(TRIM($1))`,
      [title]
    );

    if (duplicateResult.rows.length > 0) {
      return res.status(409).json({
        message:
          "Ya existe una actividad con ese título"
      });
    }

    const result = await pool.query(
      `INSERT INTO activities (
        title,
        description,
        category,
        instructions,
        estimated_duration,
        status
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6
      )
      RETURNING
        id,
        title,
        description,
        category,
        instructions,
        estimated_duration,
        status,
        created_at`,
      [
        title,
        description,
        category,
        instructions,
        estimatedDuration,
        status
      ]
    );

    return res.status(201).json({
      message:
        "Actividad terapéutica creada correctamente",
      activity: result.rows[0]
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        message:
          "Ya existe una actividad con ese título"
      });
    }

    console.error(
      "Error al crear actividad:",
      error
    );

    return res.status(500).json({
      message:
        "Error al crear la actividad terapéutica"
    });
  }
}

/**
 * PUT /api/admin/activities/:id
 *
 * Actualiza el contenido de una actividad.
 * También acepta una edición parcial.
 */
export async function updateAdminActivity(req, res) {
  try {
    const activityId =
      parsePositiveId(req.params.id);

    if (!activityId) {
      return res.status(400).json({
        message:
          "El identificador de la actividad no es válido"
      });
    }

    if (Object.keys(req.body).length === 0) {
      return res.status(400).json({
        message:
          "Debe enviar al menos un campo para actualizar"
      });
    }

    const currentResult = await pool.query(
      `SELECT
        id,
        title,
        description,
        category,
        instructions,
        estimated_duration,
        status,
        created_at
       FROM activities
       WHERE id = $1`,
      [activityId]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({
        message: "Actividad no encontrada"
      });
    }

    const currentActivity =
      currentResult.rows[0];

    const validation = prepareActivityData(
      req.body,
      currentActivity
    );

    if (validation.error) {
      return res.status(400).json({
        message: validation.error
      });
    }

    const {
      title,
      description,
      category,
      instructions,
      estimatedDuration,
      status
    } = validation.data;

    const duplicateResult = await pool.query(
      `SELECT id
       FROM activities
       WHERE LOWER(TRIM(title)) =
             LOWER(TRIM($1))
         AND id <> $2`,
      [title, activityId]
    );

    if (duplicateResult.rows.length > 0) {
      return res.status(409).json({
        message:
          "Ya existe otra actividad con ese título"
      });
    }

    const result = await pool.query(
      `UPDATE activities
       SET
        title = $1,
        description = $2,
        category = $3,
        instructions = $4,
        estimated_duration = $5,
        status = $6
       WHERE id = $7
       RETURNING
        id,
        title,
        description,
        category,
        instructions,
        estimated_duration,
        status,
        created_at`,
      [
        title,
        description,
        category,
        instructions,
        estimatedDuration,
        status,
        activityId
      ]
    );

    return res.json({
      message:
        "Actividad terapéutica actualizada correctamente",
      activity: result.rows[0]
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        message:
          "Ya existe otra actividad con ese título"
      });
    }

    console.error(
      "Error al actualizar actividad:",
      error
    );

    return res.status(500).json({
      message:
        "Error al actualizar la actividad terapéutica"
    });
  }
}

/**
 * PATCH /api/admin/activities/:id/status
 *
 * Activa o desactiva una actividad sin eliminarla.
 */
export async function updateActivityStatus(req, res) {
  try {
    const activityId =
      parsePositiveId(req.params.id);

    if (!activityId) {
      return res.status(400).json({
        message:
          "El identificador de la actividad no es válido"
      });
    }

    const status = String(
      req.body.status ??
      req.body.estado ??
      ""
    )
      .trim()
      .toLowerCase();

    if (!["active", "inactive"].includes(status)) {
      return res.status(400).json({
        message:
          "El estado de la actividad debe ser active o inactive"
      });
    }

    const currentResult = await pool.query(
      `SELECT
        id,
        title,
        description,
        category,
        instructions,
        estimated_duration,
        status,
        created_at
       FROM activities
       WHERE id = $1`,
      [activityId]
    );

    if (currentResult.rows.length === 0) {
      return res.status(404).json({
        message: "Actividad no encontrada"
      });
    }

    const currentActivity =
      currentResult.rows[0];

    if (currentActivity.status === status) {
      return res.json({
        message:
          "La actividad ya posee el estado solicitado",
        activity: currentActivity
      });
    }

    const result = await pool.query(
      `UPDATE activities
       SET status = $1
       WHERE id = $2
       RETURNING
        id,
        title,
        description,
        category,
        instructions,
        estimated_duration,
        status,
        created_at`,
      [status, activityId]
    );

    return res.json({
      message:
        status === "active"
          ? "Actividad activada correctamente"
          : "Actividad desactivada correctamente",

      activity: result.rows[0]
    });
  } catch (error) {
    console.error(
      "Error al cambiar estado de actividad:",
      error
    );

    return res.status(500).json({
      message:
        "Error al cambiar el estado de la actividad"
    });
  }
}
const ALLOWED_CRITERION_TYPES = [
  "emotion_count",
  "activity_count",
  "level",
  "streak_days",
  "points"
];

function getAchievementField(
  body,
  englishName,
  spanishName
) {
  return (
    body[englishName] ??
    body[spanishName]
  );
}

function prepareAchievementData(
  body,
  currentAchievement = null
) {
  const rawCode =
    getAchievementField(
      body,
      "code",
      "codigo"
    );

  const rawTitle =
    getAchievementField(
      body,
      "title",
      "nombre_logro"
    );

  const rawDescription =
    getAchievementField(
      body,
      "description",
      "descripcion"
    );

  const rawCriterionType =
    getAchievementField(
      body,
      "criterion_type",
      "tipo_criterio"
    );

  const rawCriterionValue =
    getAchievementField(
      body,
      "criterion_value",
      "valor_criterio"
    );

  const rawPointsRequired =
    getAchievementField(
      body,
      "points_required",
      "puntos_requeridos"
    );

  const rawStatus =
    getAchievementField(
      body,
      "status",
      "estado"
    );

  const code = String(
    rawCode ??
    currentAchievement?.code ??
    ""
  )
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");

  const title = String(
    rawTitle ??
    currentAchievement?.title ??
    ""
  ).trim();

  const description = String(
    rawDescription ??
    currentAchievement?.description ??
    ""
  ).trim();

  const criterionType = String(
    rawCriterionType ??
    currentAchievement?.criterion_type ??
    ""
  )
    .trim()
    .toLowerCase();

  let criterionValue = Number(
    rawCriterionValue ??
    currentAchievement?.criterion_value
  );

  let pointsRequired = Number(
    rawPointsRequired ??
    currentAchievement?.points_required ??
    0
  );

  const status = String(
    rawStatus ??
    currentAchievement?.status ??
    "active"
  )
    .trim()
    .toLowerCase();

  if (!code) {
    return {
      error:
        "El código del logro es obligatorio"
    };
  }

  if (
    !/^[A-Z][A-Z0-9_]{2,49}$/.test(code)
  ) {
    return {
      error:
        "El código debe tener entre 3 y 50 caracteres, iniciar con una letra y contener únicamente letras mayúsculas, números o guion bajo"
    };
  }

  if (!title) {
    return {
      error:
        "El nombre del logro es obligatorio"
    };
  }

  if (title.length > 150) {
    return {
      error:
        "El nombre del logro no puede superar los 150 caracteres"
    };
  }

  if (!description) {
    return {
      error:
        "La descripción del logro es obligatoria"
    };
  }

  if (
    !ALLOWED_CRITERION_TYPES.includes(
      criterionType
    )
  ) {
    return {
      error:
        "El tipo de criterio debe ser emotion_count, activity_count, level, streak_days o points"
    };
  }

  /*
   * Para logros basados en puntos se permite enviar
   * points_required sin criterion_value.
   */
  if (
    criterionType === "points" &&
    (
      rawCriterionValue === undefined ||
      rawCriterionValue === null
    ) &&
    pointsRequired > 0
  ) {
    criterionValue = pointsRequired;
  }

  if (
    !Number.isInteger(criterionValue) ||
    criterionValue < 1 ||
    criterionValue > 1000000
  ) {
    return {
      error:
        "El valor del criterio debe ser un número entero entre 1 y 1000000"
    };
  }

  if (
    !Number.isInteger(pointsRequired) ||
    pointsRequired < 0 ||
    pointsRequired > 1000000
  ) {
    return {
      error:
        "Los puntos requeridos deben ser un número entero entre 0 y 1000000"
    };
  }

  if (
    criterionType === "points" &&
    pointsRequired === 0
  ) {
    pointsRequired = criterionValue;
  }

  if (
    !["active", "inactive"].includes(
      status
    )
  ) {
    return {
      error:
        "El estado del logro debe ser active o inactive"
    };
  }

  return {
    data: {
      code,
      title,
      description,
      criterionType,
      criterionValue,
      pointsRequired,
      status
    }
  };
}

/**
 * GET /api/admin/achievements
 */
export async function getAdminAchievements(
  req,
  res
) {
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
        a.created_at,
        COUNT(ua.id)::INTEGER
          AS unlocked_users

       FROM achievements a

       LEFT JOIN user_achievements ua
         ON ua.achievement_id = a.id

       GROUP BY
        a.id,
        a.code,
        a.title,
        a.description,
        a.criterion_type,
        a.criterion_value,
        a.points_required,
        a.status,
        a.created_at

       ORDER BY
        a.created_at DESC,
        a.id DESC`
    );

    const activeCount =
      result.rows.filter(
        (achievement) =>
          achievement.status === "active"
      ).length;

    return res.json({
      message:
        result.rows.length > 0
          ? "Logros obtenidos correctamente"
          : "No existen logros registrados",

      total:
        result.rows.length,

      active_count:
        activeCount,

      inactive_count:
        result.rows.length -
        activeCount,

      achievements:
        result.rows
    });
  } catch (error) {
    console.error(
      "Error al consultar logros administrativos:",
      error
    );

    return res.status(500).json({
      message:
        "Error al consultar logros"
    });
  }
}

/**
 * POST /api/admin/achievements
 */
export async function createAdminAchievement(
  req,
  res
) {
  try {
    const validation =
      prepareAchievementData(req.body);

    if (validation.error) {
      return res.status(400).json({
        message: validation.error
      });
    }

    const {
      code,
      title,
      description,
      criterionType,
      criterionValue,
      pointsRequired,
      status
    } = validation.data;

    const duplicateResult =
      await pool.query(
        `SELECT id
         FROM achievements
         WHERE
           LOWER(TRIM(code)) =
             LOWER(TRIM($1))
           OR
           LOWER(TRIM(title)) =
             LOWER(TRIM($2))`,
        [code, title]
      );

    if (
      duplicateResult.rows.length > 0
    ) {
      return res.status(409).json({
        message:
          "Ya existe un logro con ese código o nombre"
      });
    }

    const result = await pool.query(
      `INSERT INTO achievements (
        code,
        title,
        description,
        criterion_type,
        criterion_value,
        points_required,
        status
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7
      )
      RETURNING
        id,
        code,
        title,
        description,
        criterion_type,
        criterion_value,
        points_required,
        status,
        created_at`,
      [
        code,
        title,
        description,
        criterionType,
        criterionValue,
        pointsRequired,
        status
      ]
    );

    return res.status(201).json({
      message:
        "Logro creado correctamente",

      achievement:
        result.rows[0]
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        message:
          "Ya existe un logro con ese código o nombre"
      });
    }

    console.error(
      "Error al crear logro:",
      error
    );

    return res.status(500).json({
      message:
        "Error al crear el logro"
    });
  }
}

/**
 * PUT /api/admin/achievements/:id
 */
export async function updateAdminAchievement(
  req,
  res
) {
  try {
    const achievementId =
      parsePositiveId(req.params.id);

    if (!achievementId) {
      return res.status(400).json({
        message:
          "El identificador del logro no es válido"
      });
    }

    if (
      Object.keys(req.body).length === 0
    ) {
      return res.status(400).json({
        message:
          "Debe enviar al menos un campo para actualizar"
      });
    }

    const currentResult =
      await pool.query(
        `SELECT
          id,
          code,
          title,
          description,
          criterion_type,
          criterion_value,
          points_required,
          status,
          created_at
         FROM achievements
         WHERE id = $1`,
        [achievementId]
      );

    if (
      currentResult.rows.length === 0
    ) {
      return res.status(404).json({
        message: "Logro no encontrado"
      });
    }

    const currentAchievement =
      currentResult.rows[0];

    const validation =
      prepareAchievementData(
        req.body,
        currentAchievement
      );

    if (validation.error) {
      return res.status(400).json({
        message: validation.error
      });
    }

    const {
      code,
      title,
      description,
      criterionType,
      criterionValue,
      pointsRequired,
      status
    } = validation.data;

    const duplicateResult =
      await pool.query(
        `SELECT id
         FROM achievements
         WHERE (
           LOWER(TRIM(code)) =
             LOWER(TRIM($1))
           OR
           LOWER(TRIM(title)) =
             LOWER(TRIM($2))
         )
         AND id <> $3`,
        [
          code,
          title,
          achievementId
        ]
      );

    if (
      duplicateResult.rows.length > 0
    ) {
      return res.status(409).json({
        message:
          "Ya existe otro logro con ese código o nombre"
      });
    }

    const result = await pool.query(
      `UPDATE achievements
       SET
        code = $1,
        title = $2,
        description = $3,
        criterion_type = $4,
        criterion_value = $5,
        points_required = $6,
        status = $7
       WHERE id = $8
       RETURNING
        id,
        code,
        title,
        description,
        criterion_type,
        criterion_value,
        points_required,
        status,
        created_at`,
      [
        code,
        title,
        description,
        criterionType,
        criterionValue,
        pointsRequired,
        status,
        achievementId
      ]
    );

    return res.json({
      message:
        "Logro actualizado correctamente",

      achievement:
        result.rows[0]
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        message:
          "Ya existe otro logro con ese código o nombre"
      });
    }

    console.error(
      "Error al actualizar logro:",
      error
    );

    return res.status(500).json({
      message:
        "Error al actualizar el logro"
    });
  }
}

/**
 * PATCH /api/admin/achievements/:id/status
 */
export async function updateAchievementStatus(
  req,
  res
) {
  try {
    const achievementId =
      parsePositiveId(req.params.id);

    if (!achievementId) {
      return res.status(400).json({
        message:
          "El identificador del logro no es válido"
      });
    }

    const status = String(
      req.body.status ??
      req.body.estado ??
      ""
    )
      .trim()
      .toLowerCase();

    if (
      !["active", "inactive"].includes(
        status
      )
    ) {
      return res.status(400).json({
        message:
          "El estado del logro debe ser active o inactive"
      });
    }

    const currentResult =
      await pool.query(
        `SELECT
          id,
          code,
          title,
          description,
          criterion_type,
          criterion_value,
          points_required,
          status,
          created_at
         FROM achievements
         WHERE id = $1`,
        [achievementId]
      );

    if (
      currentResult.rows.length === 0
    ) {
      return res.status(404).json({
        message: "Logro no encontrado"
      });
    }

    const currentAchievement =
      currentResult.rows[0];

    if (
      currentAchievement.status === status
    ) {
      return res.json({
        message:
          "El logro ya posee el estado solicitado",

        achievement:
          currentAchievement
      });
    }

    const result = await pool.query(
      `UPDATE achievements
       SET status = $1
       WHERE id = $2
       RETURNING
        id,
        code,
        title,
        description,
        criterion_type,
        criterion_value,
        points_required,
        status,
        created_at`,
      [status, achievementId]
    );

    return res.json({
      message:
        status === "active"
          ? "Logro activado correctamente"
          : "Logro desactivado correctamente",

      achievement:
        result.rows[0]
    });
  } catch (error) {
    console.error(
      "Error al cambiar estado del logro:",
      error
    );

    return res.status(500).json({
      message:
        "Error al cambiar el estado del logro"
    });
  }
}