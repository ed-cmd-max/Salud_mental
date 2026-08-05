import {
  ActivityIndicator,
  StyleSheet,
  View
} from "react-native";

import {
  Redirect
} from "expo-router";

import {
  useAuth
} from "../context/AuthContext";

export default function IndexScreen() {
  const {
    user,
    isLoading
  } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator
          size="large"
          color="#526D82"
        />
      </View>
    );
  }

  return (
    <Redirect
      href={
        !user
          ? "/(auth)/login"
          : user.role === "admin"
            ? "/(app)/admin"
            : "/(app)/home"
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F4F7F8"
  }
});