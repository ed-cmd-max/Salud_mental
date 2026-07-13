import jwt from "jsonwebtoken";
import { pool } from "../config/db.js";

export async function verifyToken(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization) {
    return res.status(401).json({
      message: "Token requerido"
    });
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      message: "Formato de token inválido"
    });
  }

  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        message: "Sesión expirada"
      });
    }

    return res.status(401).json({
      message: "Token inválido"
    });
  }

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
       WHERE id = $1`,
      [decoded.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        message: "Usuario no válido"
      });
    }

    const user = result.rows[0];

    if (user.account_status !== "active") {
      return res.status(403).json({
        message: "La cuenta se encuentra inactiva"
      });
    }

    req.user = user;

    return next();
  } catch (error) {
    console.error("Error al verificar la sesión:", error);

    return res.status(500).json({
      message: "Error interno al verificar la sesión"
    });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      message: "Acceso denegado: se requiere rol de administrador"
    });
  }

  return next();
}