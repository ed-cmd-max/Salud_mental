import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  Alert
} from "react-native";

import {
  api,
  setUnauthorizedHandler
} from "../services/api";

import {
  getToken,
  removeToken,
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

const AuthContext =
  createContext<
    AuthContextValue | undefined
  >(undefined);

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

  /**
   * Elimina la sesión cuando el servidor
   * informa que el JWT ya no es válido.
   */
  const invalidateSession =
    useCallback(
      async (): Promise<void> => {
        await removeToken();

        setToken(null);
        setUser(null);

        Alert.alert(
          "Sesión expirada",
          "Tu sesión ha expirado. Inicia sesión nuevamente.",
          [
            {
              text: "Aceptar"
            }
          ]
        );
      },
      []
    );

  /**
   * Registra el manejador global de
   * respuestas HTTP 401.
   */
  useEffect(() => {
    setUnauthorizedHandler(
      invalidateSession
    );

    return () => {
      setUnauthorizedHandler(null);
    };
  }, [invalidateSession]);

  /**
   * Inicia sesión y guarda el JWT.
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

        await saveToken(
          response.data.token
        );

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
          const storedToken =
            await getToken();

          if (!storedToken) {
            setToken(null);
            setUser(null);

            return;
          }

          const response =
            await api.get<MeResponse>(
              "/auth/me"
            );

          setToken(storedToken);

          setUser(
            response.data.user
          );
        } catch {
          await removeToken();

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
   * Registra la cuenta y después inicia
   * sesión automáticamente.
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
              name: name.trim(),
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
   * Cierre de sesión voluntario.
   */
  const signOut =
    useCallback(
      async (): Promise<void> => {
        await removeToken();

        setToken(null);
        setUser(null);
      },
      []
    );

  /**
   * Vuelve a consultar los datos de la
   * sesión actual.
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
      },
      []
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
      {children}
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