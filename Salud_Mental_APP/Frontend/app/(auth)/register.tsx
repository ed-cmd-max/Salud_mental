import {
  Ionicons
} from "@expo/vector-icons";

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

  const emailInputRef =
    useRef<TextInput | null>(
      null
    );

  const passwordInputRef =
    useRef<TextInput | null>(
      null
    );

  const confirmPasswordInputRef =
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
    name,
    setName
  ] = useState("");

  const [
    email,
    setEmail
  ] = useState("");

  const [
    password,
    setPassword
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword
  ] = useState("");

  const [
    showPassword,
    setShowPassword
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword
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

  async function handleRegister() {
    if (isSubmitting) {
      return;
    }

    Keyboard.dismiss();
    setErrorMessage(null);

    const normalizedName =
      name.trim();

    const normalizedEmail =
      email
        .trim()
        .toLowerCase();

    if (
      !normalizedName ||
      !normalizedEmail ||
      !password ||
      !confirmPassword
    ) {
      setErrorMessage(
        "Completa todos los campos para crear tu cuenta"
      );
      return;
    }

    if (
      normalizedName.length >
      100
    ) {
      setErrorMessage(
        "El nombre no puede superar los 100 caracteres"
      );
      return;
    }

    if (
      normalizedEmail.length >
      150
    ) {
      setErrorMessage(
        "El correo electrónico es demasiado largo"
      );
      return;
    }

    if (
      !EMAIL_REGEX.test(
        normalizedEmail
      )
    ) {
      setErrorMessage(
        "Ingresa un correo electrónico válido"
      );
      return;
    }

    if (
      password.length < 6
    ) {
      setErrorMessage(
        "La contraseña debe tener al menos 6 caracteres"
      );
      return;
    }

    if (
      password !==
      confirmPassword
    ) {
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

      router.replace(
        "/(app)/home"
      );
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(
          error,
          "No fue posible crear la cuenta"
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
          <Pressable
            onPress={() =>
              router.back()
            }
            disabled={
              isSubmitting
            }
            accessibilityRole="button"
            accessibilityLabel="Volver"
            style={
              styles.backButton
            }
            hitSlop={10}
          >
            <Text
              style={
                styles.backText
              }
            >
              ‹ Volver
            </Text>
          </Pressable>

          <Text
            style={styles.title}
          >
            Crear cuenta
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            Registra tus datos para
            acceder al seguimiento
            emocional y a las actividades
            de autocuidado y
            autorreflexión.
          </Text>

          <View
            style={
              styles.formCard
            }
          >
            <Text
              style={styles.label}
            >
              Nombre
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
                  name="person-outline"
                  size={20}
                  color="#718087"
                />
              </View>

              <TextInput
                value={name}
                onChangeText={(
                  value
                ) => {
                  setName(value);
                  setErrorMessage(
                    null
                  );
                }}
                style={[
                  styles.input,
                  styles.inputWithIcon
                ]}
                placeholder="Nombre completo"
                placeholderTextColor="#87939A"
                autoCapitalize="words"
                autoComplete="name"
                editable={
                  !isSubmitting
                }
                maxLength={100}
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => {
                  emailInputRef.current?.focus();
                }}
                accessibilityLabel="Nombre completo"
              />
            </View>

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
                ref={emailInputRef}
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
                maxLength={150}
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
                  setPassword(
                    value
                  );

                  setErrorMessage(
                    null
                  );
                }}
                style={[
                  styles.input,
                  styles.passwordInput
                ]}
                placeholder="Mínimo 6 caracteres"
                placeholderTextColor="#87939A"
                secureTextEntry={
                  !showPassword
                }
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                editable={
                  !isSubmitting
                }
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => {
                  confirmPasswordInputRef.current?.focus();
                }}
                accessibilityLabel="Contraseña"
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

            <Text
              style={styles.label}
            >
              Confirmar contraseña
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
                  confirmPasswordInputRef
                }
                value={
                  confirmPassword
                }
                onChangeText={(
                  value
                ) => {
                  setConfirmPassword(
                    value
                  );

                  setErrorMessage(
                    null
                  );
                }}
                style={[
                  styles.input,
                  styles.passwordInput
                ]}
                placeholder="Repite la contraseña"
                placeholderTextColor="#87939A"
                secureTextEntry={
                  !showConfirmPassword
                }
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                editable={
                  !isSubmitting
                }
                returnKeyType="done"
                accessibilityLabel="Confirmar contraseña"
                onSubmitEditing={() => {
                  Keyboard.dismiss();

                  void handleRegister();
                }}
              />

              <Pressable
                onPress={() => {
                  setShowConfirmPassword(
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
                  showConfirmPassword
                    ? "Ocultar confirmación de contraseña"
                    : "Mostrar confirmación de contraseña"
                }
              >
                <Ionicons
                  name={
                    showConfirmPassword
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
                void handleRegister();
              }}
              disabled={
                isSubmitting
              }
              accessibilityRole="button"
              accessibilityLabel="Crear cuenta"
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
                    Creando cuenta...
                  </Text>
                </View>
              ) : (
                <View
                  style={
                    styles.loadingButtonContent
                  }
                >
                  <Ionicons
                    name="person-add-outline"
                    size={19}
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.primaryButtonText
                    }
                  >
                    Crear cuenta
                  </Text>
                </View>
              )}
            </Pressable>

            <Text
              style={
                styles.loginNotice
              }
            >
              ¿Ya tienes una cuenta?
            </Text>

            <Pressable
              onPress={() => {
                Keyboard.dismiss();

                router.replace(
                  "/(auth)/login"
                );
              }}
              disabled={
                isSubmitting
              }
              accessibilityRole="button"
              accessibilityLabel="Ir a iniciar sesión"
              hitSlop={8}
            >
              <Text
                style={
                  styles.loginLink
                }
              >
                Iniciar sesión
              </Text>
            </Pressable>
          </View>
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
      paddingHorizontal: 24,
      paddingVertical: 28
    },

    backButton: {
      alignSelf:
        "flex-start",
      minHeight: 44,
      justifyContent:
        "center",
      paddingHorizontal: 4,
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
      marginBottom: 17
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

    loginNotice: {
      color: "#718087",
      fontSize: 12,
      textAlign: "center",
      lineHeight: 18,
      marginTop: 18,
      marginBottom: 4
    },

    loginLink: {
      color: "#526D82",
      fontSize: 14,
      fontWeight: "800",
      textAlign: "center"
    }
  });