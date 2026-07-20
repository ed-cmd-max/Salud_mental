import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View
} from "react-native";

import {
  Redirect,
  Stack
} from "expo-router";

import {
  useAuth
} from "../../../context/AuthContext";

export default function AdminLayout() {
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

        <Text style={styles.loadingText}>
          Verificando permisos...
        </Text>
      </View>
    );
  }

  if (!user) {
    return (
      <Redirect
        href="/(auth)/login"
      />
    );
  }

  if (user.role !== "admin") {
    return (
      <Redirect
        href="/(app)/home"
      />
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right"
      }}
    />
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2F6F7"
  },

  loadingText: {
    color: "#718087",
    fontSize: 13,
    marginTop: 12
  }
});