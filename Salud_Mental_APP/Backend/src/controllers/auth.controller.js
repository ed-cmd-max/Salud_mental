import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../config/db.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function register(req, res) {
  let client;

  try {
    const name = String(req.body.name ?? "").trim();
    const email = String(req.body.email ?? "").trim().toLowerCase();
    const password = String(req.body.password ?? "");

    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Nombre, correo y contraseña son obligatorios"
      });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        message: "El formato del correo electrónico no es válido"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "La contraseña debe tener al menos 6 caracteres"
      });
    }

    client = await pool.connect();
    await client.query("BEGIN");

    const userExists = await client.query(
      "SELECT id FROM users WHERE LOWER(email) = $1",
      [email]
    );

    if (userExists.rows.length > 0) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        message: "El correo ya está registrado"
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await client.query(
      `INSERT INTO users (
        name,
        email,
        password,
        role,
        account_status
      )
      VALUES ($1, $2, $3, 'user', 'active')
      RETURNING
        id,
        name,
        email,
        role,
        account_status,
        created_at`,
      [name, email, hashedPassword]
    );

    const user = result.rows[0];

    await client.query(
      `INSERT INTO gamification (user_id, points, level)
       VALUES ($1, 0, 1)`,
      [user.id]
    );

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Usuario registrado correctamente",
      user
    });
  } catch (error) {
    if (client) {
      await client.query("ROLLBACK");
    }

    if (error.code === "23505") {
      return res.status(409).json({
        message: "El correo ya está registrado"
      });
    }

    console.error("Error al registrar usuario:", error);

    return res.status(500).json({
      message: "Error al registrar usuario"
    });
  } finally {
    client?.release();
  }
}

export async function login(req, res) {
  try {
    const email = String(req.body.email ?? "").trim().toLowerCase();
    const password = String(req.body.password ?? "");

    if (!email || !password) {
      return res.status(400).json({
        message: "Correo y contraseña son obligatorios"
      });
    }

    const result = await pool.query(
      `SELECT
        id,
        name,
        email,
        password,
        role,
        account_status,
        created_at
       FROM users
       WHERE LOWER(email) = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Credenciales incorrectas"
      });
    }

    const user = result.rows[0];

    const validPassword = await bcrypt.compare(
      password,
      user.password
    );

    if (!validPassword) {
      return res.status(401).json({
        message: "Credenciales incorrectas"
      });
    }

    if (user.account_status !== "active") {
      return res.status(403).json({
        message: "La cuenta se encuentra inactiva"
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d"
      }
    );

    return res.json({
      message: "Inicio de sesión correcto",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        account_status: user.account_status
      }
    });
  } catch (error) {
    console.error("Error al iniciar sesión:", error);

    return res.status(500).json({
      message: "Error al iniciar sesión"
    });
  }
}

export async function getMe(req, res) {
  return res.json({
    message: "Usuario autenticado correctamente",
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      account_status: req.user.account_status,
      created_at: req.user.created_at
    }
  });
}