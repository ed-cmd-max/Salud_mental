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
  AdminActivityStatus,
  createAdminActivity,
  getAdminActivities,
  updateAdminActivity
} from "../../../services/adminService";

export default function AdminActivityFormScreen() {
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

  const activityId =
    Number(rawId);

  const hasValidActivityId =
    Number.isInteger(activityId) &&
    activityId > 0;

  const [
    title,
    setTitle
  ] = useState("");

  const [
    description,
    setDescription
  ] = useState("");

  const [
    category,
    setCategory
  ] = useState("");

  const [
    instructions,
    setInstructions
  ] = useState("");

  const [
    duration,
    setDuration
  ] = useState("");

  const [
    status,
    setStatus
  ] =
    useState<AdminActivityStatus>(
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

  const loadActivity =
    useCallback(async () => {
      if (!isEditing) {
        setIsLoading(false);
        return;
      }

      if (!hasValidActivityId) {
        setErrorMessage(
          "El identificador de la actividad no es válido"
        );

        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMessage(null);

      try {
        const result =
          await getAdminActivities();

        const activity =
          result.activities.find(
            (item) =>
              item.id === activityId
          );

        if (!activity) {
          setErrorMessage(
            "Actividad no encontrada"
          );

          return;
        }

        setTitle(activity.title);

        setDescription(
          activity.description
        );

        setCategory(
          activity.category ?? ""
        );

        setInstructions(
          activity.instructions
        );

        setDuration(
          String(
            activity.estimated_duration
          )
        );

        setStatus(activity.status);
      } catch (error) {
        setErrorMessage(
          getApiErrorMessage(
            error,
            "No fue posible consultar la actividad"
          )
        );
      } finally {
        setIsLoading(false);
      }
    }, [
      activityId,
      hasValidActivityId,
      isEditing
    ]);

  useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  async function handleSubmit() {
    setErrorMessage(null);

    const normalizedTitle =
      title.trim();

    const normalizedDescription =
      description.trim();

    const normalizedCategory =
      category.trim();

    const normalizedInstructions =
      instructions.trim();

    const numericDuration =
      Number(duration.trim());

    if (!normalizedTitle) {
      setErrorMessage(
        "El título de la actividad es obligatorio"
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
        "La descripción de la actividad es obligatoria"
      );
      return;
    }

    if (!normalizedCategory) {
      setErrorMessage(
        "La categoría de la actividad es obligatoria"
      );
      return;
    }

    if (
      normalizedCategory.length > 100
    ) {
      setErrorMessage(
        "La categoría no puede superar los 100 caracteres"
      );
      return;
    }

    if (!normalizedInstructions) {
      setErrorMessage(
        "Las instrucciones de la actividad son obligatorias"
      );
      return;
    }

    if (
      !Number.isInteger(
        numericDuration
      ) ||
      numericDuration < 1 ||
      numericDuration > 180
    ) {
      setErrorMessage(
        "La duración debe ser un número entero entre 1 y 180 minutos"
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        title:
          normalizedTitle,

        description:
          normalizedDescription,

        category:
          normalizedCategory,

        instructions:
          normalizedInstructions,

        estimated_duration:
          numericDuration,

        status
      };

      const result =
        isEditing
          ? await updateAdminActivity(
              activityId,
              payload
            )
          : await createAdminActivity(
              payload
            );

      Alert.alert(
        isEditing
          ? "Actividad actualizada"
          : "Actividad creada",

        result.message,

        [
          {
            text: "Aceptar",

            onPress: () => {
              router.replace(
                "/(app)/admin/activities"
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
            ? "No fue posible actualizar la actividad"
            : "No fue posible crear la actividad"
        )
      );
    } finally {
      setIsSubmitting(false);
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
        >
          <Pressable
            onPress={() =>
              router.back()
            }
            disabled={isSubmitting}
            style={styles.backButton}
          >
            <Text
              style={styles.backText}
            >
              ‹ Volver
            </Text>
          </Pressable>

          <View style={styles.header}>
            <Text
              style={styles.eyebrow}
            >
              ADMINISTRACIÓN
            </Text>

            <Text style={styles.title}>
              {isEditing
                ? "Editar actividad"
                : "Nueva actividad"}
            </Text>

            <Text
              style={styles.subtitle}
            >
              {isEditing
                ? "Modifica la información y disponibilidad de la actividad."
                : "Completa la información del nuevo ejercicio terapéutico."}
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
                style={
                  styles.loadingText
                }
              >
                Consultando actividad...
              </Text>
            </View>
          ) : null}

          {!isLoading ? (
            <View style={styles.formCard}>
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
                placeholder="Nombre de la actividad"
                placeholderTextColor="#87939A"
                maxLength={150}
                editable={!isSubmitting}
              />

              <Text
                style={
                  styles.characterCounter
                }
              >
                {title.length}/150
              </Text>

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
                placeholder="Explica el objetivo de la actividad..."
                placeholderTextColor="#87939A"
                multiline
                textAlignVertical="top"
                editable={!isSubmitting}
              />

              <Text style={styles.label}>
                Categoría
              </Text>

              <TextInput
                value={category}
                onChangeText={(value) => {
                  setCategory(value);
                  setErrorMessage(null);
                }}
                style={styles.input}
                placeholder="Ejemplo: Relajación"
                placeholderTextColor="#87939A"
                maxLength={100}
                editable={!isSubmitting}
              />

              <Text style={styles.label}>
                Instrucciones
              </Text>

              <TextInput
                value={instructions}
                onChangeText={(value) => {
                  setInstructions(value);
                  setErrorMessage(null);
                }}
                style={[
                  styles.input,
                  styles.instructionsInput
                ]}
                placeholder="Describe paso a paso cómo realizar el ejercicio..."
                placeholderTextColor="#87939A"
                multiline
                textAlignVertical="top"
                editable={!isSubmitting}
              />

              <Text style={styles.label}>
                Duración estimada
              </Text>

              <View
                style={
                  styles.durationRow
                }
              >
                <TextInput
                  value={duration}
                  onChangeText={(value) => {
                    setDuration(
                      value.replace(
                        /[^0-9]/g,
                        ""
                      )
                    );

                    setErrorMessage(null);
                  }}
                  style={[
                    styles.input,
                    styles.durationInput
                  ]}
                  placeholder="10"
                  placeholderTextColor="#87939A"
                  keyboardType="number-pad"
                  maxLength={3}
                  editable={!isSubmitting}
                />

                <Text
                  style={
                    styles.durationUnit
                  }
                >
                  minutos
                </Text>
              </View>

              <Text style={styles.label}>
                Estado
              </Text>

              <View
                style={styles.statusRow}
              >
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
                      styles.statusButtonText,

                      status === "active" &&
                        styles
                          .activeButtonText
                    ]}
                  >
                    Activa
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
                      styles.statusButtonText,

                      status ===
                        "inactive" &&
                        styles
                          .inactiveButtonText
                    ]}
                  >
                    Inactiva
                  </Text>
                </Pressable>
              </View>

              {errorMessage ? (
                <View
                  style={styles.errorBox}
                >
                  <Text
                    style={
                      styles.errorText
                    }
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
                      styles.submitButtonText
                    }
                  >
                    {isEditing
                      ? "Guardar cambios"
                      : "Crear actividad"}
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
    minHeight: 105
  },

  instructionsInput: {
    minHeight: 155
  },

  characterCounter: {
    color: "#87939A",
    fontSize: 10,
    textAlign: "right",
    marginBottom: 14
  },

  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 13
  },

  durationInput: {
    width: 105,
    marginBottom: 0
  },

  durationUnit: {
    color: "#60717A",
    fontSize: 13,
    marginLeft: 11
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

  statusButtonText: {
    color: "#718087",
    fontSize: 13,
    fontWeight: "800"
  },

  activeButtonText: {
    color: "#3C6C49"
  },

  inactiveButtonText: {
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

  submitButtonText: {
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