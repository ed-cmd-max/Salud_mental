import * as SecureStore from "expo-secure-store";

import {
  Platform
} from "react-native";

const TOKEN_KEY =
  "bienestar_emocional_token";

const LAST_ACTIVITY_KEY =
  "bienestar_emocional_last_activity";

export async function saveToken(
  token: string
): Promise<void> {
  if (Platform.OS === "web") {
    if (
      typeof window !==
      "undefined"
    ) {
      window.localStorage.setItem(
        TOKEN_KEY,
        token
      );
    }

    return;
  }

  await SecureStore.setItemAsync(
    TOKEN_KEY,
    token
  );
}

export async function getToken():
  Promise<string | null> {
  if (Platform.OS === "web") {
    if (
      typeof window ===
      "undefined"
    ) {
      return null;
    }

    return window.localStorage.getItem(
      TOKEN_KEY
    );
  }

  return SecureStore.getItemAsync(
    TOKEN_KEY
  );
}

export async function removeToken():
  Promise<void> {
  if (Platform.OS === "web") {
    if (
      typeof window !==
      "undefined"
    ) {
      window.localStorage.removeItem(
        TOKEN_KEY
      );
    }

    return;
  }

  await SecureStore.deleteItemAsync(
    TOKEN_KEY
  );
}

export async function saveLastActivity(
  timestamp: number
): Promise<void> {
  const value =
    String(timestamp);

  if (Platform.OS === "web") {
    if (
      typeof window !==
      "undefined"
    ) {
      window.localStorage.setItem(
        LAST_ACTIVITY_KEY,
        value
      );
    }

    return;
  }

  await SecureStore.setItemAsync(
    LAST_ACTIVITY_KEY,
    value
  );
}

export async function getLastActivity():
  Promise<number | null> {
  let value:
    | string
    | null = null;

  if (Platform.OS === "web") {
    if (
      typeof window ===
      "undefined"
    ) {
      return null;
    }

    value =
      window.localStorage.getItem(
        LAST_ACTIVITY_KEY
      );
  } else {
    value =
      await SecureStore.getItemAsync(
        LAST_ACTIVITY_KEY
      );
  }

  if (!value) {
    return null;
  }

  const timestamp =
    Number(value);

  if (
    !Number.isFinite(timestamp)
  ) {
    return null;
  }

  return timestamp;
}

export async function removeLastActivity():
  Promise<void> {
  if (Platform.OS === "web") {
    if (
      typeof window !==
      "undefined"
    ) {
      window.localStorage.removeItem(
        LAST_ACTIVITY_KEY
      );
    }

    return;
  }

  await SecureStore.deleteItemAsync(
    LAST_ACTIVITY_KEY
  );
}