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

export default function AuthLayout() {
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

  if (user) {
    return (
      <Redirect href="/(app)/home" />
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
    backgroundColor: "#F4F7F8"
  }
});