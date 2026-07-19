import axios from "axios";

import {
  getToken
} from "./tokenStorage";

interface ApiErrorBody {
  message?: string;
}

const API_URL =
  process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error(
    "Falta EXPO_PUBLIC_API_URL en el archivo .env"
  );
}

export const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json"
  }
});

/**
 * Agrega automáticamente el JWT a todas
 * las solicitudes cuando existe una sesión.
 */
api.interceptors.request.use(
  async (config) => {
    const token = await getToken();

    if (token) {
      config.headers.Authorization =
        `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Convierte errores de Axios en mensajes
 * comprensibles para el usuario.
 */
export function getApiErrorMessage(
  error: unknown,
  fallbackMessage =
    "Ocurrió un error inesperado"
): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const backendMessage =
      error.response?.data?.message;

    if (
      typeof backendMessage === "string" &&
      backendMessage.trim() !== ""
    ) {
      return backendMessage;
    }

    if (error.code === "ECONNABORTED") {
      return (
        "El servidor tardó demasiado en responder"
      );
    }

    if (!error.response) {
      return (
        "No se pudo conectar con el servidor. " +
        "Verifica que el backend esté encendido " +
        "y que la dirección IP sea correcta."
      );
    }
  }

  return fallbackMessage;
}