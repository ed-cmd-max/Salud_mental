import axios from "axios";

import {
  getToken
} from "./tokenStorage";

interface ApiErrorBody {
  message?: string;
}

type UnauthorizedHandler =
  () => void | Promise<void>;

const API_URL =
  process.env.EXPO_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error(
    "Falta EXPO_PUBLIC_API_URL en el archivo .env"
  );
}

let unauthorizedHandler:
  UnauthorizedHandler | null = null;

let isHandlingUnauthorized = false;

/**
 * Permite que AuthContext indique qué hacer
 * cuando una sesión deja de ser válida.
 */
export function setUnauthorizedHandler(
  handler: UnauthorizedHandler | null
) {
  unauthorizedHandler = handler;
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
 * Detecta cuando una sesión autenticada
 * deja de ser válida.
 */
api.interceptors.response.use(
  (response) => response,

  async (error) => {
    if (
      axios.isAxiosError<ApiErrorBody>(
        error
      ) &&
      error.response?.status === 401
    ) {
      const requestUrl =
        error.config?.url ?? "";

      /*
       * Un 401 durante el login significa
       * credenciales incorrectas y NO una
       * sesión expirada.
       */
      const isLoginRequest =
        requestUrl.includes(
          "/auth/login"
        );

      const isRegisterRequest =
        requestUrl.includes(
          "/auth/register"
        );

      if (
        !isLoginRequest &&
        !isRegisterRequest &&
        !isHandlingUnauthorized
      ) {
        const token =
          await getToken();

        /*
         * Solo cerramos sesión si realmente
         * existía un JWT almacenado.
         */
        if (
          token &&
          unauthorizedHandler
        ) {
          isHandlingUnauthorized =
            true;

          try {
            await unauthorizedHandler();
          } finally {
            isHandlingUnauthorized =
              false;
          }
        }
      }
    }

    return Promise.reject(error);
  }
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
  if (
    axios.isAxiosError<ApiErrorBody>(
      error
    )
  ) {
    const backendMessage =
      error.response?.data?.message;

    if (
      typeof backendMessage ===
        "string" &&
      backendMessage.trim() !== ""
    ) {
      return backendMessage;
    }

    if (
      error.code ===
      "ECONNABORTED"
    ) {
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