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

const EMAIL_REGEX =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen() {
  const router = useRouter();

  const {
    signUp,
    isSubmitting
  } = useAuth();

  const [name, setName] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword
  ] = useState("");

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  async function handleRegister() {
    setErrorMessage(null);

    const normalizedName = name.trim();
    const normalizedEmail =
      email.trim().toLowerCase();

    if (
      !normalizedName ||
      !normalizedEmail ||
      !password ||
      !confirmPassword
    ) {
      setErrorMessage(
        "Debe completar todos los campos"
      );
      return;
    }

    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setErrorMessage(
        "El correo electrónico no es válido"
      );
      return;
    }

    if (password.length < 6) {
      setErrorMessage(
        "La contraseña debe tener al menos 6 caracteres"
      );
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage(
        "Las contraseñas no coinciden"
      );
      return;
    }

    try {
      await signUp(
        normalizedName,
        normalizedEmail,
        password
      );

      router.replace("/(app)/home");
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(
          error,
          "No fue posible registrar la cuenta"
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
          <Pressable
            onPress={() => router.back()}
            disabled={isSubmitting}
            style={styles.backButton}
          >
            <Text style={styles.backText}>
              ‹ Volver
            </Text>
          </Pressable>

          <Text style={styles.title}>
            Crear cuenta
          </Text>

          <Text style={styles.subtitle}>
            Registra tus datos para acceder al
            seguimiento emocional y a las
            actividades terapéuticas.
          </Text>

          <View style={styles.formCard}>
            <Text style={styles.label}>
              Nombre
            </Text>

            <TextInput
              value={name}
              onChangeText={setName}
              style={styles.input}
              placeholder="Nombre completo"
              placeholderTextColor="#87939A"
              autoCapitalize="words"
              autoComplete="name"
              editable={!isSubmitting}
            />

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
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor="#87939A"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              editable={!isSubmitting}
            />

            <Text style={styles.label}>
              Confirmar contraseña
            </Text>

            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              style={styles.input}
              placeholder="Repite la contraseña"
              placeholderTextColor="#87939A"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="new-password"
              editable={!isSubmitting}
              onSubmitEditing={() => {
                void handleRegister();
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
                void handleRegister();
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
                  Crear cuenta
                </Text>
              )}
            </Pressable>

            <Text style={styles.loginNotice}>
              Después del registro se iniciará
              sesión automáticamente.
            </Text>
          </View>
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
    paddingHorizontal: 24,
    paddingVertical: 28
  },

  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    marginBottom: 16
  },

  backText: {
    color: "#526D82",
    fontSize: 16,
    fontWeight: "700"
  },

  title: {
    color: "#243642",
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 10
  },

  subtitle: {
    color: "#52636D",
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24
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
    marginBottom: 17
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

  loginNotice: {
    color: "#718087",
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 16
  }
});