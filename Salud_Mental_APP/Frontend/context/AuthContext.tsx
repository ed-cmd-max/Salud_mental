import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

import {
  Alert,
  AppState,
  AppStateStatus,
  Platform,
  View
} from "react-native";

import {
  api,
  setUnauthorizedHandler
} from "../services/api";

import {
  getLastActivity,
  getToken,
  removeLastActivity,
  removeToken,
  saveLastActivity,
  saveToken
} from "../services/tokenStorage";

export type UserRole =
  | "user"
  | "admin";

export type AccountStatus =
  | "active"
  | "inactive";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  account_status: AccountStatus;
  created_at?: string;
}

interface LoginResponse {
  message: string;
  token: string;
  user: AuthUser;
}

interface MeResponse {
  message: string;
  user: AuthUser;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;

  isLoading: boolean;
  isSubmitting: boolean;

  signIn: (
    email: string,
    password: string
  ) => Promise<AuthUser>;

  signUp: (
    name: string,
    email: string,
    password: string
  ) => Promise<void>;

  signOut: () => Promise<void>;

  refreshSession:
    () => Promise<void>;
}

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Tiempo máximo sin actividad:
 * 15 minutos.
 */
const INACTIVITY_LIMIT_MS =
  15 * 60 * 1000;

/**
 * Cada 30 segundos comprobamos
 * si la sesión superó el límite.
 */
const INACTIVITY_CHECK_MS =
  30 * 1000;

/**
 * No es necesario escribir SecureStore
 * en absolutamente cada toque.
 */
const ACTIVITY_SAVE_INTERVAL_MS =
  60 * 1000;

const AuthContext =
  createContext<
    AuthContextValue | undefined
  >(undefined);

function showSessionMessage(
  title: string,
  message: string
) {
  if (
    Platform.OS === "web"
  ) {
    if (
      typeof window !==
      "undefined"
    ) {
      window.alert(
        `${title}\n\n${message}`
      );
    }

    return;
  }

  Alert.alert(
    title,
    message,
    [
      {
        text: "Aceptar"
      }
    ]
  );
}

export function AuthProvider({
  children
}: AuthProviderProps) {
  const [
    user,
    setUser
  ] = useState<AuthUser | null>(
    null
  );

  const [
    token,
    setToken
  ] = useState<string | null>(
    null
  );

  const [
    isLoading,
    setIsLoading
  ] = useState(true);

  const [
    isSubmitting,
    setIsSubmitting
  ] = useState(false);

  const lastActivityRef =
    useRef<number>(
      Date.now()
    );

  const lastSavedActivityRef =
    useRef<number>(
      Date.now()
    );

  const appStateRef =
    useRef<AppStateStatus>(
      AppState.currentState
    );

  const inactivityHandledRef =
    useRef(false);

  /**
   * Elimina por completo los datos
   * locales de la sesión.
   */
  const clearLocalSession =
    useCallback(
      async (): Promise<void> => {
        await Promise.all([
          removeToken(),
          removeLastActivity()
        ]);

        setToken(null);
        setUser(null);
      },
      []
    );

  /**
   * Registra que el usuario continúa
   * utilizando la aplicación.
   */
  const registerActivity =
    useCallback(() => {
      if (!token) {
        return;
      }

      const now =
        Date.now();

      lastActivityRef.current =
        now;

      /**
       * Reducimos escrituras al
       * almacenamiento seguro.
       */
      if (
        now -
          lastSavedActivityRef.current >=
        ACTIVITY_SAVE_INTERVAL_MS
      ) {
        lastSavedActivityRef.current =
          now;

        void saveLastActivity(
          now
        );
      }
    }, [token]);

  /**
   * Cierra la sesión cuando se cumplen
   * 15 minutos sin actividad.
   */
  const expireForInactivity =
    useCallback(
      async (): Promise<void> => {
        if (
          !token ||
          inactivityHandledRef.current
        ) {
          return;
        }

        inactivityHandledRef.current =
          true;

        await clearLocalSession();

        showSessionMessage(
          "Sesión cerrada por inactividad",
          "Por seguridad, tu sesión se cerró después de 15 minutos sin actividad. Inicia sesión nuevamente."
        );
      },
      [
        token,
        clearLocalSession
      ]
    );

  /**
   * Elimina la sesión cuando el
   * backend devuelve HTTP 401 porque
   * el JWT ya no es válido o expiró.
   */
  const invalidateSession =
    useCallback(
      async (): Promise<void> => {
        await clearLocalSession();

        showSessionMessage(
          "Sesión expirada",
          "Tu sesión ha expirado. Inicia sesión nuevamente."
        );
      },
      [clearLocalSession]
    );

  /**
   * Registra el manejador global
   * de respuestas HTTP 401.
   */
  useEffect(() => {
    setUnauthorizedHandler(
      invalidateSession
    );

    return () => {
      setUnauthorizedHandler(
        null
      );
    };
  }, [invalidateSession]);

  /**
   * Inicia sesión y almacena el JWT
   * junto con la hora de actividad.
   */
  const authenticate =
    useCallback(
      async (
        email: string,
        password: string
      ): Promise<AuthUser> => {
        const response =
          await api.post<LoginResponse>(
            "/auth/login",
            {
              email:
                email
                  .trim()
                  .toLowerCase(),

              password
            }
          );

        const now =
          Date.now();

        await Promise.all([
          saveToken(
            response.data.token
          ),

          saveLastActivity(
            now
          )
        ]);

        lastActivityRef.current =
          now;

        lastSavedActivityRef.current =
          now;

        inactivityHandledRef.current =
          false;

        setToken(
          response.data.token
        );

        setUser(
          response.data.user
        );

        return response.data.user;
      },
      []
    );

  /**
   * Recupera una sesión guardada cuando
   * la aplicación inicia.
   */
  const loadStoredSession =
    useCallback(
      async (): Promise<void> => {
        setIsLoading(true);

        try {
          const [
            storedToken,
            storedLastActivity
          ] =
            await Promise.all([
              getToken(),
              getLastActivity()
            ]);

          if (!storedToken) {
            setToken(null);
            setUser(null);

            return;
          }

          const now =
            Date.now();

          /**
           * Si al volver a abrir la app
           * ya pasaron 15 minutos,
           * la sesión no se restaura.
           */
          if (
            storedLastActivity &&
            now -
              storedLastActivity >=
              INACTIVITY_LIMIT_MS
          ) {
            await Promise.all([
              removeToken(),
              removeLastActivity()
            ]);

            setToken(null);
            setUser(null);

            showSessionMessage(
              "Sesión cerrada por inactividad",
              "Por seguridad, tu sesión se cerró después de 15 minutos sin actividad. Inicia sesión nuevamente."
            );

            return;
          }

          const response =
            await api.get<MeResponse>(
              "/auth/me"
            );

          /**
           * Abrir nuevamente la aplicación
           * cuenta como actividad.
           */
          await saveLastActivity(
            now
          );

          lastActivityRef.current =
            now;

          lastSavedActivityRef.current =
            now;

          inactivityHandledRef.current =
            false;

          setToken(
            storedToken
          );

          setUser(
            response.data.user
          );
        } catch {
          await Promise.all([
            removeToken(),
            removeLastActivity()
          ]);

          setToken(null);
          setUser(null);
        } finally {
          setIsLoading(false);
        }
      },
      []
    );

  useEffect(() => {
    void loadStoredSession();
  }, [loadStoredSession]);

  /**
   * Revisa periódicamente la actividad
   * mientras la aplicación está abierta.
   */
  useEffect(() => {
    if (!token) {
      return;
    }

    const interval =
      setInterval(() => {
        const elapsed =
          Date.now() -
          lastActivityRef.current;

        if (
          elapsed >=
          INACTIVITY_LIMIT_MS
        ) {
          void expireForInactivity();
        }
      }, INACTIVITY_CHECK_MS);

    return () => {
      clearInterval(interval);
    };
  }, [
    token,
    expireForInactivity
  ]);

  /**
   * Controla cuando la aplicación pasa
   * al segundo plano y cuando vuelve.
   */
  useEffect(() => {
    const subscription =
      AppState.addEventListener(
        "change",
        (
          nextAppState
        ) => {
          const previousAppState =
            appStateRef.current;

          appStateRef.current =
            nextAppState;

          if (!token) {
            return;
          }

          /**
           * Al salir de la aplicación
           * guardamos el momento exacto.
           */
          if (
            nextAppState ===
              "background" ||
            nextAppState ===
              "inactive"
          ) {
            const now =
              Date.now();

            lastActivityRef.current =
              now;

            lastSavedActivityRef.current =
              now;

            void saveLastActivity(
              now
            );

            return;
          }

          /**
           * Cuando vuelve al primer plano,
           * comprobamos cuánto tiempo
           * estuvo fuera.
           */
          if (
            nextAppState ===
              "active" &&
            (
              previousAppState ===
                "background" ||
              previousAppState ===
                "inactive"
            )
          ) {
            void (async () => {
              const storedActivity =
                await getLastActivity();

              const lastActivity =
                storedActivity ??
                lastActivityRef.current;

              const elapsed =
                Date.now() -
                lastActivity;

              if (
                elapsed >=
                INACTIVITY_LIMIT_MS
              ) {
                await expireForInactivity();

                return;
              }

              registerActivity();
            })();
          }
        }
      );

    return () => {
      subscription.remove();
    };
  }, [
    token,
    expireForInactivity,
    registerActivity
  ]);

  const signIn =
    useCallback(
      async (
        email: string,
        password: string
      ): Promise<AuthUser> => {
        setIsSubmitting(true);

        try {
          return await authenticate(
            email,
            password
          );
        } finally {
          setIsSubmitting(false);
        }
      },
      [authenticate]
    );

  /**
   * Registra la cuenta y posteriormente
   * inicia sesión automáticamente.
   */
  const signUp =
    useCallback(
      async (
        name: string,
        email: string,
        password: string
      ): Promise<void> => {
        setIsSubmitting(true);

        try {
          const normalizedEmail =
            email
              .trim()
              .toLowerCase();

          await api.post(
            "/auth/register",
            {
              name:
                name.trim(),

              email:
                normalizedEmail,

              password
            }
          );

          await authenticate(
            normalizedEmail,
            password
          );
        } finally {
          setIsSubmitting(false);
        }
      },
      [authenticate]
    );

  /**
   * Cierre voluntario de sesión.
   */
  const signOut =
    useCallback(
      async (): Promise<void> => {
        inactivityHandledRef.current =
          true;

        await clearLocalSession();
      },
      [clearLocalSession]
    );

  /**
   * Vuelve a consultar los datos de
   * la sesión actual.
   */
  const refreshSession =
    useCallback(
      async (): Promise<void> => {
        const response =
          await api.get<MeResponse>(
            "/auth/me"
          );

        setUser(
          response.data.user
        );

        registerActivity();
      },
      [registerActivity]
    );

  const contextValue =
    useMemo<AuthContextValue>(
      () => ({
        user,
        token,
        isLoading,
        isSubmitting,
        signIn,
        signUp,
        signOut,
        refreshSession
      }),
      [
        user,
        token,
        isLoading,
        isSubmitting,
        signIn,
        signUp,
        signOut,
        refreshSession
      ]
    );

  return (
    <AuthContext.Provider
      value={contextValue}
    >
      <View
        style={{
          flex: 1
        }}
        onTouchStart={
          registerActivity
        }
      >
        {children}
      </View>
    </AuthContext.Provider>
  );
}

export function useAuth():
  AuthContextValue {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth debe utilizarse dentro de AuthProvider"
    );
  }

  return context;
}