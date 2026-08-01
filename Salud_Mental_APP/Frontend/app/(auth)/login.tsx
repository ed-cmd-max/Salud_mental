import React, {
  useState
} from "react";

import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import {
  useRouter
} from "expo-router";

import {
  useAuth
} from "../../context/AuthContext";

import {
  getApiErrorMessage
} from "../../services/api";

export default function LoginScreen() {
  const router = useRouter();

  const {
    signIn,
    isSubmitting
  } = useAuth();

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  async function handleLogin() {
  setErrorMessage(null);

  if (!email.trim() || !password) {
    setErrorMessage(
      "Debe completar el correo y la contraseña"
    );
    return;
  }

  try {
    const authenticatedUser = await signIn(
      email,
      password
    );

    router.replace(
      authenticatedUser.role === "admin"
        ? "/(app)/admin"
        : "/(app)/home"
    );
  } catch (error) {
    setErrorMessage(
      getApiErrorMessage(
        error,
        "No fue posible iniciar sesión"
      )
    );
  }
}

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <ScrollView
          contentContainerStyle={
            styles.scrollContent
          }
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.eyebrow}>
              BIENESTAR EMOCIONAL
            </Text>

            <Text style={styles.title}>
              Bienvenido
            </Text>

            <Text style={styles.subtitle}>
              Inicia sesión para registrar tus
              emociones, realizar actividades y
              revisar tu progreso.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.label}>
              Correo electrónico
            </Text>

            <TextInput
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              placeholder="correo@ejemplo.com"
              placeholderTextColor="#87939A"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              editable={!isSubmitting}
            />

            <Text style={styles.label}>
              Contraseña
            </Text>

            <TextInput
              value={password}
              onChangeText={setPassword}
              style={styles.input}
              placeholder="Ingresa tu contraseña"
              placeholderTextColor="#87939A"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              editable={!isSubmitting}
              onSubmitEditing={() => {
                void handleLogin();
              }}
            />

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            <Pressable
              onPress={() => {
                void handleLogin();
              }}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.primaryButton,
                pressed &&
                  styles.primaryButtonPressed,
                isSubmitting &&
                  styles.disabledButton
              ]}
            >
              {isSubmitting ? (
                <ActivityIndicator
                  color="#FFFFFF"
                />
              ) : (
                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
                  Iniciar sesión
                </Text>
              )}
            </Pressable>

            <View style={styles.registerRow}>
              <Text style={styles.secondaryText}>
                ¿Todavía no tienes una cuenta?
              </Text>

              <Pressable
                onPress={() => {
                  router.push(
                    "/(auth)/register"
                  );
                }}
                disabled={isSubmitting}
              >
                <Text style={styles.linkText}>
                  Registrarse
                </Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.footerText}>
            La aplicación proporciona herramientas
            de seguimiento y apoyo; no reemplaza la
            atención de un profesional.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#EAF0F2"
  },

  keyboardView: {
    flex: 1
  },

  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32
  },

  header: {
    marginBottom: 28
  },

  eyebrow: {
    color: "#526D82",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 10
  },

  title: {
    color: "#243642",
    fontSize: 34,
    fontWeight: "800",
    marginBottom: 10
  },

  subtitle: {
    color: "#52636D",
    fontSize: 16,
    lineHeight: 24
  },

  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 22,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 6
    },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4
  },

  label: {
    color: "#243642",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8
  },

  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: "#D5DEE2",
    borderRadius: 14,
    paddingHorizontal: 16,
    color: "#243642",
    backgroundColor: "#F8FAFB",
    fontSize: 16,
    marginBottom: 18
  },

  errorBox: {
    backgroundColor: "#FDECEC",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16
  },

  errorText: {
    color: "#A33232",
    fontSize: 14,
    lineHeight: 20
  },

  primaryButton: {
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#526D82",
    borderRadius: 15,
    marginTop: 4
  },

  primaryButtonPressed: {
    opacity: 0.86
  },

  disabledButton: {
    opacity: 0.6
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800"
  },

  registerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    columnGap: 6,
    marginTop: 22
  },

  secondaryText: {
    color: "#65747C",
    fontSize: 14
  },

  linkText: {
    color: "#526D82",
    fontSize: 14,
    fontWeight: "800"
  },

  footerText: {
    marginTop: 24,
    color: "#718087",
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
    paddingHorizontal: 12
  }
});