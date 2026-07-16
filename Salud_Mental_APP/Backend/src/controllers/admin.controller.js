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