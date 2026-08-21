import {
  Ionicons
} from "@expo/vector-icons";

import {
  useRouter
} from "expo-router";

import React, {
  useEffect,
  useRef,
  useState
} from "react";

import {
  ActivityIndicator,
  Animated,
  Keyboard,
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

  const passwordInputRef =
    useRef<TextInput | null>(
      null
    );

  const errorOpacity =
    useRef(
      new Animated.Value(0)
    ).current;

  const errorTranslateY =
    useRef(
      new Animated.Value(6)
    ).current;

  const [
    email,
    setEmail
  ] = useState("");

  const [
    password,
    setPassword
  ] = useState("");

  const [
    showPassword,
    setShowPassword
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage
  ] =
    useState<string | null>(
      null
    );

  useEffect(() => {
    if (!errorMessage) {
      errorOpacity.setValue(0);
      errorTranslateY.setValue(6);
      return;
    }

    Animated.parallel([
      Animated.timing(
        errorOpacity,
        {
          toValue: 1,
          duration: 220,
          useNativeDriver: true
        }
      ),

      Animated.timing(
        errorTranslateY,
        {
          toValue: 0,
          duration: 220,
          useNativeDriver: true
        }
      )
    ]).start();
  }, [
    errorMessage,
    errorOpacity,
    errorTranslateY
  ]);

  async function handleLogin() {
    if (isSubmitting) {
      return;
    }

    Keyboard.dismiss();
    setErrorMessage(null);

    const normalizedEmail =
      email
        .trim()
        .toLowerCase();

    if (
      !normalizedEmail ||
      !password
    ) {
      setErrorMessage(
        "Ingresa tu correo electrónico y contraseña"
      );
      return;
    }

    try {
      const authenticatedUser =
        await signIn(
          normalizedEmail,
          password
        );

      router.replace(
        authenticatedUser.role ===
          "admin"
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
    <SafeAreaView
      style={styles.safeArea}
    >
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
          showsVerticalScrollIndicator={
            false
          }
        >
          <View
            style={styles.header}
          >
            <Text
              style={styles.eyebrow}
            >
              BIENESTAR EMOCIONAL
            </Text>

            <Text
              style={styles.title}
            >
              Bienvenido
            </Text>

            <Text
              style={styles.subtitle}
            >
              Inicia sesión para registrar
              tus emociones, realizar
              actividades y revisar tu
              progreso.
            </Text>
          </View>

          <View
            style={styles.formCard}
          >
            <Text
              style={styles.label}
            >
              Correo electrónico
            </Text>

            <View
              style={
                styles.inputContainer
              }
            >
              <View
                style={
                  styles.inputIcon
                }
              >
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color="#718087"
                />
              </View>

              <TextInput
                value={email}
                onChangeText={(
                  value
                ) => {
                  setEmail(value);

                  setErrorMessage(
                    null
                  );
                }}
                style={[
                  styles.input,
                  styles.inputWithIcon
                ]}
                placeholder="correo@ejemplo.com"
                placeholderTextColor="#87939A"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                editable={
                  !isSubmitting
                }
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => {
                  passwordInputRef.current?.focus();
                }}
                accessibilityLabel="Correo electrónico"
              />
            </View>

            <Text
              style={styles.label}
            >
              Contraseña
            </Text>

            <View
              style={
                styles.passwordContainer
              }
            >
              <View
                style={
                  styles.inputIcon
                }
              >
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color="#718087"
                />
              </View>

              <TextInput
                ref={
                  passwordInputRef
                }
                value={password}
                onChangeText={(
                  value
                ) => {
                  setPassword(value);

                  setErrorMessage(
                    null
                  );
                }}
                style={[
                  styles.input,
                  styles.passwordInput
                ]}
                placeholder="Ingresa tu contraseña"
                placeholderTextColor="#87939A"
                secureTextEntry={
                  !showPassword
                }
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="current-password"
                editable={
                  !isSubmitting
                }
                returnKeyType="done"
                accessibilityLabel="Contraseña"
                onSubmitEditing={() => {
                  Keyboard.dismiss();

                  void handleLogin();
                }}
              />

              <Pressable
                onPress={() => {
                  setShowPassword(
                    (
                      current
                    ) =>
                      !current
                  );
                }}
                disabled={
                  isSubmitting
                }
                style={
                  styles.eyeButton
                }
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={
                  showPassword
                    ? "Ocultar contraseña"
                    : "Mostrar contraseña"
                }
              >
                <Ionicons
                  name={
                    showPassword
                      ? "eye-off-outline"
                      : "eye-outline"
                  }
                  size={22}
                  color="#526D82"
                />
              </Pressable>
            </View>

            {errorMessage ? (
              <Animated.View
                style={[
                  styles.errorBox,
                  {
                    opacity:
                      errorOpacity,

                    transform: [
                      {
                        translateY:
                          errorTranslateY
                      }
                    ]
                  }
                ]}
                accessibilityRole="alert"
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={20}
                  color="#A33232"
                />

                <Text
                  style={
                    styles.errorText
                  }
                >
                  {errorMessage}
                </Text>
              </Animated.View>
            ) : null}

            <Pressable
              onPress={() => {
                void handleLogin();
              }}
              disabled={
                isSubmitting
              }
              accessibilityRole="button"
              accessibilityLabel="Iniciar sesión"
              accessibilityState={{
                disabled:
                  isSubmitting
              }}
              style={({
                pressed
              }) => [
                styles.primaryButton,

                pressed &&
                  styles.primaryButtonPressed,

                isSubmitting &&
                  styles.disabledButton
              ]}
            >
              {isSubmitting ? (
                <View
                  style={
                    styles.loadingButtonContent
                  }
                >
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.primaryButtonText
                    }
                  >
                    Iniciando sesión...
                  </Text>
                </View>
              ) : (
                <View
                  style={
                    styles.loadingButtonContent
                  }
                >
                  <Ionicons
                    name="log-in-outline"
                    size={20}
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.primaryButtonText
                    }
                  >
                    Iniciar sesión
                  </Text>
                </View>
              )}
            </Pressable>

            <View
              style={
                styles.registerRow
              }
            >
              <Text
                style={
                  styles.secondaryText
                }
              >
                ¿Todavía no tienes una
                cuenta?
              </Text>

              <Pressable
                onPress={() => {
                  Keyboard.dismiss();

                  router.push(
                    "/(auth)/register"
                  );
                }}
                disabled={
                  isSubmitting
                }
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Registrarse"
              >
                <Text
                  style={
                    styles.linkText
                  }
                >
                  Registrarse
                </Text>
              </Pressable>
            </View>
          </View>

          <Text
            style={styles.footerText}
          >
            La aplicación proporciona
            herramientas de seguimiento y
            apoyo; no reemplaza la atención
            de un profesional.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor:
        "#EAF0F2"
    },

    keyboardView: {
      flex: 1
    },

    scrollContent: {
      flexGrow: 1,
      justifyContent:
        "center",
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
      backgroundColor:
        "#FFFFFF",
      borderRadius: 24,
      padding: 22,
      shadowColor:
        "#000000",
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

    inputContainer: {
      position: "relative"
    },

    passwordContainer: {
      position: "relative"
    },

    input: {
      minHeight: 52,
      borderWidth: 1,
      borderColor:
        "#D5DEE2",
      borderRadius: 14,
      paddingHorizontal: 16,
      color: "#243642",
      backgroundColor:
        "#F8FAFB",
      fontSize: 16,
      marginBottom: 18
    },

    inputWithIcon: {
      paddingLeft: 46
    },

    passwordInput: {
      paddingLeft: 46,
      paddingRight: 52
    },

    inputIcon: {
      position: "absolute",
      zIndex: 2,
      left: 14,
      top: 16
    },

    eyeButton: {
      position: "absolute",
      right: 6,
      top: 4,
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent:
        "center"
    },

    errorBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor:
        "#FDECEC",
      borderRadius: 12,
      padding: 12,
      marginBottom: 16
    },

    errorText: {
      flex: 1,
      color: "#A33232",
      fontSize: 14,
      lineHeight: 20
    },

    primaryButton: {
      minHeight: 54,
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor:
        "#526D82",
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

    loadingButtonContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      gap: 8
    },

    registerRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent:
        "center",
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