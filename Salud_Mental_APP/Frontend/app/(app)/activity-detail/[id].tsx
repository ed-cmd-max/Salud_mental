import AchievementNotification
  from "../../../components/AchievementNotification";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";

import {
  ActivityIndicator,
  Alert,
  Animated,
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
  Activity,
  CompleteActivityResponse,
  completeActivity,
  getActivityById
} from "../../../services/activityService";

export default function ActivityDetailScreen() {
  const router = useRouter();

  const params =
    useLocalSearchParams<{
      id?: string | string[];
    }>();

  const rawId =
    Array.isArray(params.id)
      ? params.id[0]
      : params.id;

  const activityId =
    Number(rawId);

  const isValidActivityId =
    Number.isInteger(activityId) &&
    activityId > 0;

  const [
    activity,
    setActivity
  ] =
    useState<Activity | null>(
      null
    );

  const [
    responseText,
    setResponseText
  ] = useState("");

  const [
    observation,
    setObservation
  ] = useState("");

  const [
    isLoading,
    setIsLoading
  ] = useState(true);

  const [
    isSubmitting,
    setIsSubmitting
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage
  ] =
    useState<string | null>(
      null
    );

  const [
    formError,
    setFormError
  ] =
    useState<string | null>(
      null
    );

  const [
    successResult,
    setSuccessResult
  ] =
    useState<CompleteActivityResponse | null>(
      null
    );

  /*
   * Cola de logros desbloqueados.
   *
   * Si una sola actividad desbloquea
   * varios logros, se mostrarán
   * uno después de otro.
   */
  const [
    achievementQueue,
    setAchievementQueue
  ] = useState<string[]>(
    []
  );

  const currentAchievement =
    achievementQueue[0] ??
    null;

  const successOpacity =
    useRef(
      new Animated.Value(0)
    ).current;

  const successTranslateY =
    useRef(
      new Animated.Value(8)
    ).current;

  const hasUnsavedChanges =
    responseText.trim().length >
      0 ||
    observation.trim().length >
      0;

  const loadActivity =
    useCallback(
      async () => {
        if (
          !isValidActivityId
        ) {
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
            await getActivityById(
              activityId
            );

          setActivity(result);
        } catch (error) {
          setActivity(null);

          setErrorMessage(
            getApiErrorMessage(
              error,
              "No fue posible consultar la actividad"
            )
          );
        } finally {
          setIsLoading(false);
        }
      },
      [
        activityId,
        isValidActivityId
      ]
    );

  useEffect(() => {
    void loadActivity();
  }, [loadActivity]);

  useEffect(() => {
    if (!successResult) {
      successOpacity.setValue(
        0
      );

      successTranslateY.setValue(
        8
      );

      return;
    }

    Animated.parallel([
      Animated.timing(
        successOpacity,
        {
          toValue: 1,
          duration: 260,
          useNativeDriver: true
        }
      ),

      Animated.timing(
        successTranslateY,
        {
          toValue: 0,
          duration: 260,
          useNativeDriver: true
        }
      )
    ]).start();
  }, [
    successResult,
    successOpacity,
    successTranslateY
  ]);

  function confirmNavigation(
    action: () => void
  ) {
    if (isSubmitting) {
      return;
    }

    if (!hasUnsavedChanges) {
      action();

      return;
    }

    Alert.alert(
      "¿Salir sin guardar?",
      "Tienes información escrita que todavía no has guardado.",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Salir",
          style: "destructive",
          onPress: action
        }
      ]
    );
  }

  function handleBack() {
    confirmNavigation(() => {
      router.back();
    });
  }

  function handleOpenHistory() {
    confirmNavigation(() => {
      router.push(
        "/(app)/completed-activities"
      );
    });
  }

  async function handleComplete() {
    if (isSubmitting) {
      return;
    }

    setFormError(null);
    setSuccessResult(null);

    const normalizedResponse =
      responseText.trim();

    const normalizedObservation =
      observation.trim();

    if (!normalizedResponse) {
      setFormError(
        "La respuesta de la actividad es obligatoria"
      );

      return;
    }

    if (
      normalizedResponse.length >
      2000
    ) {
      setFormError(
        "La respuesta no puede superar los 2000 caracteres"
      );

      return;
    }

    if (
      normalizedObservation.length >
      500
    ) {
      setFormError(
        "La observación no puede superar los 500 caracteres"
      );

      return;
    }

    setIsSubmitting(true);

    try {
      const result =
        await completeActivity(
          activityId,
          {
            response:
              normalizedResponse,

            observation:
              normalizedObservation ||
              undefined
          }
        );

      setSuccessResult(result);

      /*
       * El backend devuelve exactamente
       * los logros que fueron desbloqueados
       * durante esta actividad.
       */
      const newAchievementTitles =
        (
          result
            .unlocked_achievements ??
          []
        )
          .map(
            (achievement) =>
              achievement.title
          )
          .filter(
            (title) =>
              title.trim() !== ""
          );

      /*
       * Los agregamos a la cola para
       * mostrarlos uno después de otro.
       */
      if (
        newAchievementTitles.length >
        0
      ) {
        setAchievementQueue(
          (currentQueue) => [
            ...currentQueue,
            ...newAchievementTitles
          ]
        );
      }

      setResponseText("");
      setObservation("");
    } catch (error) {
      setFormError(
        getApiErrorMessage(
          error,
          "No fue posible guardar la actividad"
        )
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const estimatedDuration =
    Number(
      activity?.estimated_duration ??
        0
    );

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <AchievementNotification
        title={currentAchievement}
        onHide={() => {
          setAchievementQueue(
            (currentQueue) =>
              currentQueue.slice(1)
          );
        }}
      />

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
            onPress={handleBack}
            disabled={
              isSubmitting
            }
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Volver"
            style={
              styles.backButton
            }
          >
            <Text
              style={styles.backText}
            >
              ‹ Volver
            </Text>
          </Pressable>

          {isLoading ? (
            <View
              style={
                styles.loadingBox
              }
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

          {!isLoading &&
          errorMessage ? (
            <View
              style={
                styles.errorBox
              }
            >
              <Text
                style={
                  styles.errorTitle
                }
              >
                Actividad no disponible
              </Text>

              <Text
                style={
                  styles.errorText
                }
              >
                {errorMessage}
              </Text>

              <Pressable
                onPress={() => {
                  void loadActivity();
                }}
                accessibilityRole="button"
                accessibilityLabel="Intentar nuevamente"
                style={
                  styles.retryButton
                }
              >
                <Text
                  style={
                    styles.retryText
                  }
                >
                  Intentar nuevamente
                </Text>
              </Pressable>
            </View>
          ) : null}

          {!isLoading &&
          activity ? (
            <>
              <View
                style={
                  styles.header
                }
              >
                <Text
                  style={
                    styles.category
                  }
                >
                  {activity.category ||
                    "ACTIVIDAD DE AUTOCUIDADO Y AUTORREFLEXIÓN"}
                </Text>

                <Text
                  style={
                    styles.title
                  }
                >
                  {activity.title}
                </Text>

                <Text
                  style={
                    styles.description
                  }
                >
                  {
                    activity.description
                  }
                </Text>
              </View>

              <View
                style={
                  styles.metadataRow
                }
              >
                <View
                  style={
                    styles.metadataCard
                  }
                >
                  <Text
                    style={
                      styles.metadataValue
                    }
                  >
                    {
                      activity
                        .estimated_duration
                    }
                  </Text>

                  <Text
                    style={
                      styles.metadataLabel
                    }
                  >
                    {estimatedDuration ===
                    1
                      ? "minuto"
                      : "minutos"}
                  </Text>
                </View>

                <View
                  style={
                    styles.metadataCard
                  }
                >
                  <Text
                    style={
                      styles.metadataValue
                    }
                  >
                    Disponible
                  </Text>

                  <Text
                    style={
                      styles.metadataLabel
                    }
                  >
                    estado
                  </Text>
                </View>
              </View>

              <View
                style={
                  styles.instructionsCard
                }
              >
                <Text
                  style={
                    styles.instructionsTitle
                  }
                >
                  Instrucciones
                </Text>

                <Text
                  style={
                    styles.instructionsText
                  }
                >
                  {
                    activity.instructions
                  }
                </Text>
              </View>

              <View
                style={
                  styles.formCard
                }
              >
                <Text
                  style={
                    styles.formTitle
                  }
                >
                  Tu respuesta
                </Text>

                <Text
                  style={
                    styles.formHelp
                  }
                >
                  Describe cómo realizaste
                  el ejercicio y qué
                  identificaste durante la
                  actividad.
                </Text>

                <TextInput
                  value={
                    responseText
                  }
                  onChangeText={(
                    value
                  ) => {
                    setResponseText(
                      value
                    );

                    setFormError(
                      null
                    );

                    setSuccessResult(
                      null
                    );
                  }}
                  style={[
                    styles.input,
                    styles.responseInput
                  ]}
                  placeholder="Escribe aquí tu respuesta..."
                  placeholderTextColor="#87939A"
                  multiline
                  textAlignVertical="top"
                  maxLength={2000}
                  editable={
                    !isSubmitting
                  }
                  accessibilityLabel="Respuesta de la actividad"
                />

                <Text
                  style={
                    styles.characterCounter
                  }
                >
                  {
                    responseText.length
                  }
                  /2000
                </Text>

                <Text
                  style={
                    styles.label
                  }
                >
                  Observación opcional
                </Text>

                <TextInput
                  value={
                    observation
                  }
                  onChangeText={(
                    value
                  ) => {
                    setObservation(
                      value
                    );

                    setFormError(
                      null
                    );

                    setSuccessResult(
                      null
                    );
                  }}
                  style={[
                    styles.input,
                    styles.observationInput
                  ]}
                  placeholder="Agrega una reflexión breve..."
                  placeholderTextColor="#87939A"
                  multiline
                  textAlignVertical="top"
                  maxLength={500}
                  editable={
                    !isSubmitting
                  }
                  accessibilityLabel="Observación opcional"
                />

                <Text
                  style={
                    styles.characterCounter
                  }
                >
                  {
                    observation.length
                  }
                  /500
                </Text>

                {formError ? (
                  <View
                    style={
                      styles.formErrorBox
                    }
                  >
                    <Text
                      style={
                        styles.formErrorText
                      }
                    >
                      {formError}
                    </Text>
                  </View>
                ) : null}

                {successResult ? (
                  <Animated.View
                    style={[
                      styles.successBox,
                      {
                        opacity:
                          successOpacity,

                        transform: [
                          {
                            translateY:
                              successTranslateY
                          }
                        ]
                      }
                    ]}
                  >
                    <Text
                      style={
                        styles.successTitle
                      }
                    >
                      ✓ Actividad completada
                    </Text>

                    <Text
                      style={
                        styles.successMessage
                      }
                    >
                      {
                        successResult.message
                      }
                    </Text>

                    {successResult
                      .already_rewarded ? (
                      <Text
                        style={
                          styles.repeatNotice
                        }
                      >
                        Tu nueva respuesta se
                        guardó correctamente
                        en el historial. Esta
                        actividad ya había
                        otorgado su recompensa
                        anteriormente.
                      </Text>
                    ) : null}

                    <View
                      style={
                        styles.progressRow
                      }
                    >
                      <View
                        style={
                          styles.progressItem
                        }
                      >
                        <Text
                          style={
                            styles.progressValue
                          }
                        >
                          +
                          {
                            successResult
                              .points_added
                          }
                        </Text>

                        <Text
                          style={
                            styles.progressLabel
                          }
                        >
                          {successResult
                            .points_added ===
                          1
                            ? "punto"
                            : "puntos"}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.progressItem
                        }
                      >
                        <Text
                          style={
                            styles.progressValue
                          }
                        >
                          {
                            successResult
                              .progress
                              .level
                          }
                        </Text>

                        <Text
                          style={
                            styles.progressLabel
                          }
                        >
                          nivel
                        </Text>
                      </View>

                      <View
                        style={
                          styles.progressItem
                        }
                      >
                        <Text
                          style={
                            styles.progressValue
                          }
                        >
                          {
                            successResult
                              .progress
                              .streak_days
                          }
                        </Text>

                        <Text
                          style={
                            styles.progressLabel
                          }
                        >
                          {successResult
                            .progress
                            .streak_days ===
                          1
                            ? "día de racha"
                            : "días de racha"}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.progressItem
                        }
                      >
                        <Text
                          style={
                            styles.progressValue
                          }
                        >
                          {
                            successResult
                              .progress
                              .activities_completed
                          }
                        </Text>

                        <Text
                          style={
                            styles.progressLabel
                          }
                        >
                          {successResult
                            .progress
                            .activities_completed ===
                          1
                            ? "actividad"
                            : "actividades"}
                        </Text>
                      </View>
                    </View>
                  </Animated.View>
                ) : null}

                <Pressable
                  onPress={() => {
                    void handleComplete();
                  }}
                  disabled={
                    isSubmitting
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Completar actividad"
                  style={({
                    pressed
                  }) => [
                    styles.completeButton,

                    pressed &&
                      styles.buttonPressed,

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
                          styles.completeButtonText
                        }
                      >
                        Guardando...
                      </Text>
                    </View>
                  ) : (
                    <Text
                      style={
                        styles.completeButtonText
                      }
                    >
                      Completar actividad
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={
                    handleOpenHistory
                  }
                  disabled={
                    isSubmitting
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Ver actividades completadas"
                  style={({
                    pressed
                  }) => [
                    styles.historyButton,

                    pressed &&
                      styles.buttonPressed,

                    isSubmitting &&
                      styles.disabledButton
                  ]}
                >
                  <Text
                    style={
                      styles.historyButtonText
                    }
                  >
                    Ver actividades completadas
                  </Text>
                </Pressable>
              </View>
            </>
          ) : null}
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
        "#F2F6F7"
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
      alignSelf:
        "flex-start",
      minHeight: 44,
      justifyContent:
        "center",
      paddingHorizontal: 4,
      marginBottom: 10
    },

    backText: {
      color: "#526D82",
      fontSize: 16,
      fontWeight: "700"
    },

    loadingBox: {
      alignItems: "center",
      paddingVertical: 70
    },

    loadingText: {
      color: "#718087",
      fontSize: 13,
      marginTop: 12
    },

    errorBox: {
      backgroundColor:
        "#FDECEC",
      borderRadius: 18,
      padding: 18
    },

    errorTitle: {
      color: "#8E3030",
      fontSize: 17,
      fontWeight: "800",
      marginBottom: 6
    },

    errorText: {
      color: "#A14848",
      fontSize: 13,
      lineHeight: 19
    },

    retryButton: {
      minHeight: 46,
      alignItems: "center",
      justifyContent:
        "center",
      borderWidth: 1,
      borderColor:
        "#A14848",
      borderRadius: 13,
      marginTop: 15
    },

    retryText: {
      color: "#8E3030",
      fontSize: 13,
      fontWeight: "800"
    },

    header: {
      marginBottom: 20
    },

    category: {
      color: "#526D82",
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 1.1,
      textTransform:
        "uppercase",
      marginBottom: 8
    },

    title: {
      color: "#243642",
      fontSize: 29,
      fontWeight: "800",
      marginBottom: 10
    },

    description: {
      color: "#60717A",
      fontSize: 15,
      lineHeight: 22
    },

    metadataRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 16
    },

    metadataCard: {
      flex: 1,
      alignItems: "center",
      justifyContent:
        "center",
      minHeight: 80,
      backgroundColor:
        "#FFFFFF",
      borderRadius: 17
    },

    metadataValue: {
      color: "#405F70",
      fontSize: 17,
      fontWeight: "900"
    },

    metadataLabel: {
      color: "#7A888F",
      fontSize: 12,
      marginTop: 3
    },

    instructionsCard: {
      backgroundColor:
        "#E6EEF1",
      borderRadius: 20,
      padding: 19,
      marginBottom: 18
    },

    instructionsTitle: {
      color: "#405A69",
      fontSize: 17,
      fontWeight: "800",
      marginBottom: 9
    },

    instructionsText: {
      color: "#526873",
      fontSize: 14,
      lineHeight: 22
    },

    formCard: {
      backgroundColor:
        "#FFFFFF",
      borderRadius: 22,
      padding: 19,
      elevation: 3,
      shadowColor:
        "#000000",
      shadowOpacity: 0.05,
      shadowRadius: 9,
      shadowOffset: {
        width: 0,
        height: 4
      }
    },

    formTitle: {
      color: "#243642",
      fontSize: 19,
      fontWeight: "800",
      marginBottom: 5
    },

    formHelp: {
      color: "#718087",
      fontSize: 13,
      lineHeight: 19,
      marginBottom: 15
    },

    label: {
      color: "#243642",
      fontSize: 14,
      fontWeight: "800",
      marginBottom: 8
    },

    input: {
      borderWidth: 1,
      borderColor:
        "#D5DEE2",
      borderRadius: 14,
      backgroundColor:
        "#F8FAFB",
      color: "#243642",
      fontSize: 14,
      paddingHorizontal: 14,
      paddingVertical: 13
    },

    responseInput: {
      minHeight: 150
    },

    observationInput: {
      minHeight: 95
    },

    characterCounter: {
      color: "#87939A",
      fontSize: 12,
      textAlign: "right",
      marginTop: 5,
      marginBottom: 16
    },

    formErrorBox: {
      backgroundColor:
        "#FDECEC",
      borderRadius: 13,
      padding: 13,
      marginBottom: 15
    },

    formErrorText: {
      color: "#A33232",
      fontSize: 13,
      lineHeight: 19
    },

    successBox: {
      backgroundColor:
        "#E7F3EA",
      borderRadius: 16,
      padding: 16,
      marginBottom: 16
    },

    successTitle: {
      color: "#315F40",
      fontSize: 16,
      fontWeight: "800",
      marginBottom: 5
    },

    successMessage: {
      color: "#486D54",
      fontSize: 13,
      lineHeight: 19
    },

    repeatNotice: {
      color: "#627C69",
      fontSize: 12,
      lineHeight: 18,
      marginTop: 9
    },

    progressRow: {
      flexDirection: "row",
      marginTop: 15
    },

    progressItem: {
      flex: 1,
      alignItems: "center"
    },

    progressValue: {
      color: "#315F40",
      fontSize: 18,
      fontWeight: "900"
    },

    progressLabel: {
      color: "#62806B",
      fontSize: 12,
      marginTop: 2,
      textAlign: "center"
    },

    completeButton: {
      minHeight: 54,
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor:
        "#526D82",
      borderRadius: 15
    },

    completeButtonText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "800"
    },

    loadingButtonContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "center",
      gap: 8
    },

    historyButton: {
      minHeight: 50,
      alignItems: "center",
      justifyContent:
        "center",
      borderWidth: 1,
      borderColor:
        "#526D82",
      borderRadius: 15,
      marginTop: 11
    },

    historyButtonText: {
      color: "#526D82",
      fontSize: 14,
      fontWeight: "800"
    },

    buttonPressed: {
      opacity: 0.82
    },

    disabledButton: {
      opacity: 0.6
    }
  });