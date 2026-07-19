import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "salud_mental_auth_token";

/**
 * Guarda el JWT de la sesión.
 */
export async function saveToken(
  token: string
): Promise<void> {
  await SecureStore.setItemAsync(
    TOKEN_KEY,
    token
  );
}

/**
 * Recupera el JWT guardado.
 */
export async function getToken(): Promise<
  string | null
> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

/**
 * Elimina el JWT al cerrar sesión
 * o cuando la sesión deja de ser válida.
 */
export async function removeToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}