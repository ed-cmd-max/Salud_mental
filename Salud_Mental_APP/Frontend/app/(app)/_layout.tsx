import {
  ActivityIndicator,
  StyleSheet,
  View
} from "react-native";

import {
  Redirect,
  Stack
} from "expo-router";

import {
  useAuth
} from "../../context/AuthContext";

export default function ProtectedLayout() {
  const {
    user,
    isLoading
  } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          size="large"
          color="#526D82"
        />
      </View>
    );
  }

  if (!user) {
    return (
      <Redirect href="/(auth)/login" />
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right"
      }}
    >
      <Stack.Protected
        guard={user.role === "user"}
      >
        <Stack.Screen name="home" />

        <Stack.Screen
          name="emotion-register"
        />

        <Stack.Screen
          name="emotion-history"
        />

        <Stack.Screen
          name="activities"
        />

        <Stack.Screen
          name="activity-detail/[id]"
        />

        <Stack.Screen
          name="completed-activities"
        />

        <Stack.Screen
          name="gamification"
        />
      </Stack.Protected>

      <Stack.Protected
        guard={user.role === "admin"}
      >
        <Stack.Screen name="admin" />
      </Stack.Protected>
    </Stack>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F7F8"
  }
});