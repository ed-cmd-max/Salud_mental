import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

import {
  AuthProvider
} from "../context/AuthContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />

      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade"
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false
          }}
        />

        <Stack.Screen
          name="(auth)"
          options={{
            headerShown: false
          }}
        />

        <Stack.Screen
          name="(app)"
          options={{
            headerShown: false
          }}
        />
      </Stack>
    </AuthProvider>
  );
}