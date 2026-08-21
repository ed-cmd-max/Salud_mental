import React, {
  useCallback,
  useEffect,
  useState
} from "react";

import {
  ActivityIndicator,
  Alert,
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
  useLocalSearchParams,
  useRouter
} from "expo-router";

import {
  getApiErrorMessage
} from "../../../services/api";

import {
  AdminAchievementCriterion,
  AdminAchievementStatus,
  createAdminAchievement,
  getAdminAchievements,
  updateAdminAchievement
} from "../../../services/adminService";

interface CriterionOption {
  value:
    AdminAchievementCriterion;
  label: string;
  description: string;
}

const CRITERION_OPTIONS:
  CriterionOption[] = [
    {
      value: "emotion_count",
      label: "Emociones",
      description:
        "Cantidad de registros emocionales"
    },
    {
      value: "activity_count",
      label: "Actividades",
      description:
        "Actividades diferentes completadas"
    },
    {
      value: "level",
      label: "Nivel",
      description:
        "Nivel alcanzado por el usuario"
    },
    {
      value: "streak_days",
      label: "Racha",
      description:
        "Días consecutivos de uso"
    },
    {
      value: "points",
      label: "Puntos",
      description:
        "Puntos totales acumulados"
    }
  ];

function normalizeCode(
  value: string
): string {
  return value
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
}

export default function AdminAchievementFormScreen() {
  const router = useRouter();

  const params =
    useLocalSearchParams<{
      id?: string | string[];
    }>();

  const rawId =
    Array.isArray(params.id)
      ? params.id[0]
      : params.id;

  const isEditing =
    rawId !== undefined;

  const achievementId =
    Number(rawId);

  const hasValidAchievementId =
    Number.isInteger(
      achievementId
    ) &&
    achievementId > 0;

  const [
    code,
    setCode
  ] = useState("");

  const [
    title,
    setTitle
  ] = useState("");

  const [
    description,
    setDescription
  ] = useState("");

  const [
    criterionType,
    setCriterionType
  ] =
    useState<AdminAchievementCriterion>(
      "emotion_count"
    );

  const [
    criterionValue,
    setCriterionValue
  ] = useState("1");

  const [
    pointsRequired,
    setPointsRequired
  ] = useState("0");

  const [
    status,
    setStatus
  ] =
    useState<AdminAchievementStatus>(
      "active"
    );

  const [
    isLoading,
    setIsLoading
  ] = useState(isEditing);

  const [
    isSubmitting,
    setIsSubmitting
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage
  ] = useState<string | null>(
    null
  );

  const loadAchievement =
    useCallback(async () => {
      if (!isEditing) {
        setIsLoading(false);
        return;
      }

      if (
        !hasValidAchievementId
      ) {
        setErrorMessage(
          "El identificador del logro no es válido"
        );

        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const result =
          await getAdminAchievements();

        const achievement =
          result.achievements.find(
            (item) =>
              item.id === achievementId
          );

        if (!achievement) {
          setErrorMessage(
            "Logro no encontrado"
          );

          return;
        }

        setCode(achievement.code);
        setTitle(achievement.title);

        setDescription(
          achievement.description
        );

        setCriterionType(
          achievement.criterion_type
        );

        setCriterionValue(
          String(
            achievement.criterion_value
          )
        );

        setPointsRequired(
          String(
            achievement.points_required
          )
        );

        setStatus(achievement.status);
      } catch (error) {
        setErrorMessage(
          getApiErrorMessage(
            error,
            "No fue posible consultar el logro"
          )
        );
      } finally {
        setIsLoading(false);
      }
    }, [
      achievementId,
      hasValidAchievementId,
      isEditing
    ]);

  useEffect(() => {
    void loadAchievement();
  }, [loadAchievement]);

  async function handleSubmit() {
    setErrorMessage(null);

    const normalizedCode =
      normalizeCode(code.trim());

    const normalizedTitle =
      title.trim();

    const normalizedDescription =
      description.trim();

    const numericCriterionValue =
      Number(
        criterionValue.trim()
      );

    const numericPointsRequired =
      Number(
        pointsRequired.trim()
      );

    if (!normalizedCode) {
      setErrorMessage(
        "El código del logro es obligatorio"
      );
      return;
    }

    if (
      normalizedCode.length < 3 ||
      normalizedCode.length > 50
    ) {
      setErrorMessage(
        "El código debe tener entre 3 y 50 caracteres"
      );
      return;
    }

    if (
      !/^[A-Z0-9_]+$/.test(
        normalizedCode
      )
    ) {
      setErrorMessage(
        "El código solo puede contener letras, números y guion bajo"
      );
      return;
    }

    if (!normalizedTitle) {
      setErrorMessage(
        "El título del logro es obligatorio"
      );
      return;
    }

    if (
      normalizedTitle.length > 150
    ) {
      setErrorMessage(
        "El título no puede superar los 150 caracteres"
      );
      return;
    }

    if (!normalizedDescription) {
      setErrorMessage(
        "La descripción del logro es obligatoria"
      );
      return;
    }

    if (
      !Number.isInteger(
        numericCriterionValue
      ) ||
      numericCriterionValue < 1
    ) {
      setErrorMessage(
        "El valor del criterio debe ser un número entero mayor o igual a 1"
      );
      return;
    }

    if (
      !Number.isInteger(
        numericPointsRequired
      ) ||
      numericPointsRequired < 0
    ) {
      setErrorMessage(
        "Los puntos requeridos deben ser un número entero mayor o igual a 0"
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        code:
          normalizedCode,

        title:
          normalizedTitle,

        description:
          normalizedDescription,

        criterion_type:
          criterionType,

        criterion_value:
          numericCriterionValue,

        points_required:
          numericPointsRequired,

        status
      };

      const result =
        isEditing
          ? await updateAdminAchievement(
              achievementId,
              payload
            )
          : await createAdminAchievement(
              payload
            );

      Alert.alert(
        isEditing
          ? "Logro actualizado"
          : "Logro creado",

        result.message,

        [
          {
            text: "Aceptar",

            onPress: () => {
              router.replace(
                "/(app)/admin/achievements"
              );
            }
          }
        ]
      );
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(
          error,
          isEditing
            ? "No fue posible actualizar el logro"
            : "No fue posible crear el logro"
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedCriterion =
    CRITERION_OPTIONS.find(
      (option) =>
        option.value ===
        criterionType
    );

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
        >
          <Pressable
            onPress={() =>
              router.back()
            }
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel="Volver"
            style={styles.backButton}
          >
            <Text
              style={styles.backText}
            >
              ‹ Volver
            </Text>
          </Pressable>

          <View style={styles.header}>
            <Text style={styles.eyebrow}>
              ADMINISTRACIÓN
            </Text>

            <Text style={styles.title}>
              {isEditing
                ? "Editar logro"
                : "Nuevo logro"}
            </Text>

            <Text style={styles.subtitle}>
              Configura la recompensa y el
              criterio que deberá cumplir el
              usuario.
            </Text>
          </View>

          {isLoading ? (
            <View
              style={styles.loadingBox}
            >
              <ActivityIndicator
                size="large"
                color="#526D82"
              />

              <Text
                style={styles.loadingText}
              >
                Consultando logro...
              </Text>
            </View>
          ) : null}

          {!isLoading ? (
            <View style={styles.formCard}>
              <Text style={styles.label}>
                Código
              </Text>

              <TextInput
                value={code}
                onChangeText={(value) => {
                  setCode(
                    normalizeCode(value)
                  );

                  setErrorMessage(null);
                }}
                style={styles.input}
                placeholder="EJEMPLO_LOGRO"
                placeholderTextColor="#87939A"
                autoCapitalize="characters"
                maxLength={50}
                editable={!isSubmitting}
              />

              <Text style={styles.helpText}>
                Identificador único. Se
                guardará en mayúsculas y con
                guiones bajos.
              </Text>

              <Text style={styles.label}>
                Título
              </Text>

              <TextInput
                value={title}
                onChangeText={(value) => {
                  setTitle(value);
                  setErrorMessage(null);
                }}
                style={styles.input}
                placeholder="Nombre visible del logro"
                placeholderTextColor="#87939A"
                maxLength={150}
                editable={!isSubmitting}
              />

              <Text style={styles.label}>
                Descripción
              </Text>

              <TextInput
                value={description}
                onChangeText={(value) => {
                  setDescription(value);
                  setErrorMessage(null);
                }}
                style={[
                  styles.input,
                  styles.descriptionInput
                ]}
                placeholder="Explica cómo se desbloquea..."
                placeholderTextColor="#87939A"
                multiline
                textAlignVertical="top"
                editable={!isSubmitting}
              />

              <Text style={styles.label}>
                Tipo de criterio
              </Text>

              <View
                style={styles.criteriaBox}
              >
                {CRITERION_OPTIONS.map(
                  (option) => {
                    const isSelected =
                      criterionType ===
                      option.value;

                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => {
                          setCriterionType(
                            option.value
                          );

                          setErrorMessage(
                            null
                          );
                        }}
                        disabled={
                          isSubmitting
                        }
                        style={[
                          styles.criterionButton,

                          isSelected &&
                            styles
                              .criterionButtonSelected
                        ]}
                      >
                        <Text
                          style={[
                            styles
                              .criterionButtonTitle,

                            isSelected &&
                              styles
                                .criterionButtonTitleSelected
                          ]}
                        >
                          {option.label}
                        </Text>

                        <Text
                          style={[
                            styles
                              .criterionButtonDescription,

                            isSelected &&
                              styles
                                .criterionButtonDescriptionSelected
                          ]}
                        >
                          {
                            option.description
                          }
                        </Text>
                      </Pressable>
                    );
                  }
                )}
              </View>

              <View style={styles.infoBox}>
                <Text
                  style={styles.infoTitle}
                >
                  Criterio seleccionado
                </Text>

                <Text
                  style={styles.infoText}
                >
                  {selectedCriterion
                    ?.description}
                </Text>
              </View>

              <Text style={styles.label}>
                Valor necesario
              </Text>

              <TextInput
                value={criterionValue}
                onChangeText={(value) => {
                  setCriterionValue(
                    value.replace(
                      /[^0-9]/g,
                      ""
                    )
                  );

                  setErrorMessage(null);
                }}
                style={[
                  styles.input,
                  styles.numericInput
                ]}
                placeholder="1"
                placeholderTextColor="#87939A"
                keyboardType="number-pad"
                maxLength={6}
                editable={!isSubmitting}
              />

              <Text style={styles.helpText}>
                Ejemplo: con el criterio
                “Emociones” y valor 5, el
                usuario deberá registrar cinco
                emociones.
              </Text>

              <Text style={styles.label}>
                Puntos requeridos
              </Text>

              <TextInput
                value={pointsRequired}
                onChangeText={(value) => {
                  setPointsRequired(
                    value.replace(
                      /[^0-9]/g,
                      ""
                    )
                  );

                  setErrorMessage(null);
                }}
                style={[
                  styles.input,
                  styles.numericInput
                ]}
                placeholder="0"
                placeholderTextColor="#87939A"
                keyboardType="number-pad"
                maxLength={7}
                editable={!isSubmitting}
              />

              <Text style={styles.helpText}>
                Mantén este campo en 0 cuando
                el logro dependa únicamente del
                criterio seleccionado.
              </Text>

              <Text style={styles.label}>
                Estado
              </Text>

              <View style={styles.statusRow}>
                <Pressable
                  onPress={() =>
                    setStatus("active")
                  }
                  disabled={isSubmitting}
                  style={[
                    styles.statusButton,

                    status === "active" &&
                      styles.activeButton
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,

                      status === "active" &&
                        styles.activeText
                    ]}
                  >
                    Activo
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() =>
                    setStatus("inactive")
                  }
                  disabled={isSubmitting}
                  style={[
                    styles.statusButton,

                    status ===
                      "inactive" &&
                      styles.inactiveButton
                  ]}
                >
                  <Text
                    style={[
                      styles.statusText,

                      status ===
                        "inactive" &&
                        styles.inactiveText
                    ]}
                  >
                    Inactivo
                  </Text>
                </Pressable>
              </View>

              {errorMessage ? (
                <View style={styles.errorBox}>
                  <Text
                    style={styles.errorText}
                  >
                    {errorMessage}
                  </Text>
                </View>
              ) : null}

              <Pressable
                onPress={() => {
                  void handleSubmit();
                }}
                disabled={isSubmitting}
                style={({ pressed }) => [
                  styles.submitButton,

                  pressed &&
                    styles.buttonPressed,

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
                      styles.submitText
                    }
                  >
                    {isEditing
                      ? "Guardar cambios"
                      : "Crear logro"}
                  </Text>
                )}
              </Pressable>
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F2F6F7"
  },

  keyboardView: {
    flex: 1
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 45
  },

  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    marginBottom: 10
  },

  backText: {
    color: "#526D82",
    fontSize: 16,
    fontWeight: "700"
  },

  header: {
    marginBottom: 20
  },

  eyebrow: {
    color: "#7A6847",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginBottom: 7
  },

  title: {
    color: "#243642",
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 8
  },

  subtitle: {
    color: "#60717A",
    fontSize: 15,
    lineHeight: 22
  },

  loadingBox: {
    alignItems: "center",
    paddingVertical: 65
  },

  loadingText: {
    color: "#718087",
    fontSize: 13,
    marginTop: 12
  },

  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 19,
    elevation: 3,
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 9,
    shadowOffset: {
      width: 0,
      height: 4
    }
  },

  label: {
    color: "#243642",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 8
  },

  input: {
    minHeight: 51,
    borderWidth: 1,
    borderColor: "#D5DEE2",
    borderRadius: 14,
    backgroundColor: "#F8FAFB",
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#243642",
    fontSize: 14,
    marginBottom: 8
  },

  descriptionInput: {
    minHeight: 110
  },

  numericInput: {
    width: 130
  },

  helpText: {
    color: "#87939A",
    fontSize: 10,
    lineHeight: 15,
    marginBottom: 16
  },

  criteriaBox: {
    marginBottom: 12
  },

  criterionButton: {
    borderWidth: 1,
    borderColor: "#D5DEE2",
    borderRadius: 14,
    backgroundColor: "#F8FAFB",
    padding: 13,
    marginBottom: 8
  },

  criterionButtonSelected: {
    borderColor: "#526D82",
    backgroundColor: "#E6EEF1"
  },

  criterionButtonTitle: {
    color: "#52616A",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 3
  },

  criterionButtonTitleSelected: {
    color: "#405F70"
  },

  criterionButtonDescription: {
    color: "#87939A",
    fontSize: 10
  },

  criterionButtonDescriptionSelected: {
    color: "#607883"
  },

  infoBox: {
    backgroundColor: "#EDF3F5",
    borderRadius: 14,
    padding: 13,
    marginBottom: 17
  },

  infoTitle: {
    color: "#405A69",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 3
  },

  infoText: {
    color: "#60717A",
    fontSize: 11,
    lineHeight: 17
  },

  statusRow: {
    flexDirection: "row",
    marginBottom: 18
  },

  statusButton: {
    flex: 1,
    minHeight: 47,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D5DEE2",
    borderRadius: 13,
    backgroundColor: "#F8FAFB"
  },

  activeButton: {
    backgroundColor: "#E1F1E5",
    borderColor: "#6B9A78",
    marginRight: 8
  },

  inactiveButton: {
    backgroundColor: "#F4E1E1",
    borderColor: "#B87575",
    marginLeft: 8
  },

  statusText: {
    color: "#718087",
    fontSize: 13,
    fontWeight: "800"
  },

  activeText: {
    color: "#3C6C49"
  },

  inactiveText: {
    color: "#984747"
  },

  errorBox: {
    backgroundColor: "#FDECEC",
    borderRadius: 13,
    padding: 13,
    marginBottom: 15
  },

  errorText: {
    color: "#A33232",
    fontSize: 13,
    lineHeight: 19
  },

  submitButton: {
    minHeight: 54,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#526D82",
    borderRadius: 15
  },

  submitText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800"
  },

  buttonPressed: {
    opacity: 0.82
  },

  disabledButton: {
    opacity: 0.6
  }
});