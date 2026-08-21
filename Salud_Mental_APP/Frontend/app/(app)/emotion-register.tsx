import {
  displayDateToIso,
  formatDateInput,
  getTodayDisplayDate,
  getTodayIsoDate
} from "../../utils/date";

import React, {
  useEffect,
  useRef,
  useState
} from "react";

import {
  ActivityIndicator,
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
  useRouter
} from "expo-router";

import {
  getApiErrorMessage
} from "../../services/api";

import {
  createEmotion,
  CreateEmotionResponse
} from "../../services/emotionService";

interface EmotionOption {
  name: string;
  emoji: string;
}

const EMOTIONS: EmotionOption[] = [
  {
    name: "Alegría",
    emoji: "😊"
  },
  {
    name: "Tranquilidad",
    emoji: "😌"
  },
  {
    name: "Motivación",
    emoji: "💪"
  },
  {
    name: "Tristeza",
    emoji: "😔"
  },
  {
    name: "Ansiedad",
    emoji: "😟"
  },
  {
    name: "Enojo",
    emoji: "😠"
  },
  {
    name: "Miedo",
    emoji: "😨"
  },
  {
    name: "Cansancio",
    emoji: "😴"
  }
];

function getIntensityDescription(
  value: number
): string {
  if (value <= 2) {
    return "Muy baja";
  }

  if (value <= 4) {
    return "Baja";
  }

  if (value <= 6) {
    return "Media";
  }

  if (value <= 8) {
    return "Alta";
  }

  return "Muy alta";
}

export default function EmotionRegisterScreen() {
  const router = useRouter();

  const [
    selectedEmotion,
    setSelectedEmotion
  ] = useState<string | null>(null);

  const [
    intensity,
    setIntensity
  ] = useState(5);

  const [
    description,
    setDescription
  ] = useState("");

  const [
    recordDate,
    setRecordDate
  ] = useState(
    getTodayDisplayDate()
  );

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

  const [
    successResult,
    setSuccessResult
  ] =
    useState<CreateEmotionResponse | null>(
      null
    );

  const successOpacity =
    useRef(
      new Animated.Value(0)
    ).current;

  const successTranslateY =
    useRef(
      new Animated.Value(8)
    ).current;

  useEffect(() => {
    if (!successResult) {
      successOpacity.setValue(0);
      successTranslateY.setValue(8);
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

  async function handleSubmit() {
    setErrorMessage(null);
    setSuccessResult(null);

    if (!selectedEmotion) {
      setErrorMessage(
        "Selecciona la emoción que estás sintiendo"
      );
      return;
    }

    const normalizedDate =
      displayDateToIso(
        recordDate.trim()
      );

    if (!normalizedDate) {
      setErrorMessage(
        "Ingresa una fecha válida en formato DD/MM/AAAA"
      );
      return;
    }

    if (
      normalizedDate >
      getTodayIsoDate()
    ) {
      setErrorMessage(
        "La fecha del registro no puede ser futura"
      );
      return;
    }

    const normalizedDescription =
      description.trim();

    if (
      normalizedDescription.length >
      500
    ) {
      setErrorMessage(
        "La descripción no puede superar los 500 caracteres"
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const result =
        await createEmotion({
          emotion:
            selectedEmotion,
          intensity,
          description:
            normalizedDescription ||
            undefined,
          fecha_registro:
            normalizedDate
        });

      setSuccessResult(result);

      setSelectedEmotion(null);
      setIntensity(5);
      setDescription("");
      setRecordDate(
        getTodayDisplayDate()
      );
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(
          error,
          "No fue posible registrar la emoción"
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
          showsVerticalScrollIndicator={
            false
          }
        >
          <Pressable
            onPress={() =>
              router.back()
            }
            disabled={isSubmitting}
            style={styles.backButton}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Text
              style={styles.backText}
            >
              ‹ Volver
            </Text>
          </Pressable>

          <View style={styles.header}>
            <Text style={styles.title}>
              Registro emocional
            </Text>

            <Text
              style={styles.subtitle}
            >
              Identifica cómo te sientes y
              registra la intensidad de tu
              emoción.
            </Text>
          </View>

          <View style={styles.formCard}>
            <Text
              style={
                styles.sectionTitle
              }
            >
              ¿Cómo te sientes?
            </Text>

            <Text
              style={
                styles.sectionHelp
              }
            >
              Selecciona la emoción que
              mejor describa tu estado
              actual.
            </Text>

            <View
              style={
                styles.emotionsContainer
              }
            >
              {EMOTIONS.map(
                (emotion) => {
                  const isSelected =
                    selectedEmotion ===
                    emotion.name;

                  return (
                    <Pressable
                      key={
                        emotion.name
                      }
                      onPress={() => {
                        setSelectedEmotion(
                          emotion.name
                        );

                        setSuccessResult(
                          null
                        );

                        setErrorMessage(
                          null
                        );
                      }}
                      disabled={
                        isSubmitting
                      }
                      accessibilityRole="button"
                      accessibilityLabel={`Emoción ${emotion.name}`}
                      accessibilityState={{
                        selected:
                          isSelected
                      }}
                      style={({
                        pressed
                      }) => [
                        styles.emotionButton,

                        isSelected &&
                          styles.emotionButtonSelected,

                        pressed &&
                          styles.buttonPressed
                      ]}
                    >
                      <Text
                        style={
                          styles.emotionEmoji
                        }
                      >
                        {
                          emotion.emoji
                        }
                      </Text>

                      <Text
                        style={[
                          styles.emotionName,

                          isSelected &&
                            styles.emotionNameSelected
                        ]}
                      >
                        {isSelected
                          ? "✓ "
                          : ""}
                        {emotion.name}
                      </Text>
                    </Pressable>
                  );
                }
              )}
            </View>

            <View
              style={styles.divider}
            />

            <Text
              style={
                styles.sectionTitle
              }
            >
              Intensidad
            </Text>

            <Text
              style={
                styles.sectionHelp
              }
            >
              Selecciona un valor del 1 al
              10.
            </Text>

            <View
              style={
                styles.intensityContainer
              }
            >
              {Array.from(
                {
                  length: 10
                },
                (_, index) =>
                  index + 1
              ).map((value) => {
                const isSelected =
                  intensity === value;

                return (
                  <Pressable
                    key={value}
                    onPress={() => {
                      setIntensity(
                        value
                      );

                      setSuccessResult(
                        null
                      );

                      setErrorMessage(
                        null
                      );
                    }}
                    disabled={
                      isSubmitting
                    }
                    accessibilityRole="button"
                    accessibilityLabel={`Intensidad ${value}`}
                    accessibilityState={{
                      selected:
                        isSelected
                    }}
                    style={({
                      pressed
                    }) => [
                      styles.intensityButton,

                      isSelected &&
                        styles.intensityButtonSelected,

                      pressed &&
                        styles.buttonPressed
                    ]}
                  >
                    <Text
                      style={[
                        styles.intensityText,

                        isSelected &&
                          styles.intensityTextSelected
                      ]}
                    >
                      {isSelected
                        ? `✓ ${value}`
                        : value}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View
              style={
                styles.intensityLabels
              }
            >
              <Text
                style={
                  styles.intensityLabel
                }
              >
                Muy baja
              </Text>

              <Text
                style={
                  styles.intensityLabel
                }
              >
                Muy alta
              </Text>
            </View>

            <View
              style={
                styles.intensitySummary
              }
            >
              <Text
                style={
                  styles.intensitySummaryText
                }
              >
                {intensity}/10 · Intensidad{" "}
                {getIntensityDescription(
                  intensity
                ).toLowerCase()}
              </Text>
            </View>

            <View
              style={styles.divider}
            />

            <Text
              style={styles.label}
            >
              Fecha del registro
            </Text>

            <TextInput
              value={recordDate}
              onChangeText={(value) => {
                setRecordDate(
                  formatDateInput(
                    value
                  )
                );

                setSuccessResult(
                  null
                );

                setErrorMessage(
                  null
                );
              }}
              style={styles.input}
              placeholder="DD/MM/AAAA"
              placeholderTextColor="#87939A"
              keyboardType="numeric"
              maxLength={10}
              editable={
                !isSubmitting
              }
              accessibilityLabel="Fecha del registro"
            />

            <Text
              style={
                styles.fieldHelp
              }
            >
              Ejemplo:{" "}
              {getTodayDisplayDate()}
            </Text>

            <Text
              style={styles.label}
            >
              Descripción opcional
            </Text>

            <TextInput
              value={description}
              onChangeText={(value) => {
                setDescription(
                  value
                );

                setSuccessResult(
                  null
                );

                setErrorMessage(
                  null
                );
              }}
              style={[
                styles.input,
                styles.descriptionInput
              ]}
              placeholder="Escribe brevemente qué ocurrió o cómo te sientes..."
              placeholderTextColor="#87939A"
              multiline
              textAlignVertical="top"
              maxLength={500}
              editable={
                !isSubmitting
              }
              accessibilityLabel="Descripción opcional"
            />

            <Text
              style={
                styles.characterCounter
              }
            >
              {description.length}/500
            </Text>

            {errorMessage ? (
              <View
                style={
                  styles.errorBox
                }
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
                  ✓ Registro guardado
                </Text>

                <Text
                  style={
                    styles.successText
                  }
                >
                  {
                    successResult.message
                  }
                </Text>

                <View
                  style={
                    styles.progressSummary
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
                </View>
              </Animated.View>
            ) : null}

            <Pressable
              onPress={() => {
                void handleSubmit();
              }}
              disabled={
                isSubmitting
              }
              accessibilityRole="button"
              accessibilityLabel="Guardar registro emocional"
              style={({
                pressed
              }) => [
                styles.submitButton,

                pressed &&
                  styles.buttonPressed,

                isSubmitting &&
                  styles.disabledButton
              ]}
            >
              {isSubmitting ? (
                <View
                  style={
                    styles.submitLoadingContent
                  }
                >
                  <ActivityIndicator
                    size="small"
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.submitButtonText
                    }
                  >
                    Guardando...
                  </Text>
                </View>
              ) : (
                <Text
                  style={
                    styles.submitButtonText
                  }
                >
                  Guardar registro emocional
                </Text>
              )}
            </Pressable>
          </View>

          <View
            style={
              styles.informationBox
            }
          >
            <Text
              style={
                styles.informationTitle
              }
            >
              Recuerda
            </Text>

            <Text
              style={
                styles.informationText
              }
            >
              No existen emociones buenas o
              malas. Registrarlas puede
              ayudarte a reconocer patrones y
              comprender mejor cómo te
              sientes.
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
    backgroundColor: "#F2F6F7"
  },

  keyboardView: {
    flex: 1
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 40
  },

  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginBottom: 10
  },

  backText: {
    color: "#526D82",
    fontSize: 16,
    fontWeight: "700"
  },

  header: {
    marginBottom: 22
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

  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 5
    },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3
  },

  sectionTitle: {
    color: "#243642",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 5
  },

  sectionHelp: {
    color: "#718087",
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 15
  },

  emotionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 10
  },

  emotionButton: {
    width: "48.5%",
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D6E0E4",
    borderRadius: 16,
    paddingHorizontal: 13,
    backgroundColor: "#F8FAFB"
  },

  emotionButtonSelected: {
    borderColor: "#526D82",
    backgroundColor: "#E5EEF2"
  },

  emotionEmoji: {
    fontSize: 25,
    marginRight: 9
  },

  emotionName: {
    flex: 1,
    color: "#53646D",
    fontSize: 13,
    fontWeight: "700"
  },

  emotionNameSelected: {
    color: "#243642"
  },

  divider: {
    height: 1,
    backgroundColor: "#E5ECEF",
    marginVertical: 22
  },

  intensityContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 9
  },

  intensityButton: {
    minWidth: 44,
    height: 44,
    paddingHorizontal: 5,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D5DEE2",
    borderRadius: 22,
    backgroundColor: "#F8FAFB"
  },

  intensityButtonSelected: {
    backgroundColor: "#526D82",
    borderColor: "#526D82"
  },

  intensityText: {
    color: "#52636D",
    fontSize: 14,
    fontWeight: "800"
  },

  intensityTextSelected: {
    color: "#FFFFFF"
  },

  intensityLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 11,
    paddingHorizontal: 3
  },

  intensityLabel: {
    color: "#839097",
    fontSize: 12
  },

  intensitySummary: {
    alignItems: "center",
    marginTop: 12
  },

  intensitySummaryText: {
    color: "#526D82",
    fontSize: 13,
    fontWeight: "800"
  },

  label: {
    color: "#243642",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 8
  },

  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: "#D5DEE2",
    borderRadius: 14,
    paddingHorizontal: 15,
    color: "#243642",
    backgroundColor: "#F8FAFB",
    fontSize: 15,
    marginBottom: 7
  },

  descriptionInput: {
    minHeight: 120,
    paddingTop: 14,
    paddingBottom: 14
  },

  fieldHelp: {
    color: "#87939A",
    fontSize: 12,
    marginBottom: 19
  },

  characterCounter: {
    color: "#87939A",
    fontSize: 12,
    textAlign: "right",
    marginBottom: 16
  },

  errorBox: {
    backgroundColor: "#FDECEC",
    borderRadius: 13,
    padding: 13,
    marginBottom: 16
  },

  errorText: {
    color: "#A33232",
    fontSize: 13,
    lineHeight: 19
  },

  successBox: {
    backgroundColor: "#E7F3EA",
    borderRadius: 16,
    padding: 16,
    marginBottom: 17
  },

  successTitle: {
    color: "#315F40",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 5
  },

  successText: {
    color: "#486D54",
    fontSize: 13,
    lineHeight: 19
  },

  progressSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15
  },

  progressItem: {
    flex: 1,
    alignItems: "center"
  },

  progressValue: {
    color: "#315F40",
    fontSize: 19,
    fontWeight: "900"
  },

  progressLabel: {
    color: "#62806B",
    fontSize: 12,
    marginTop: 2,
    textAlign: "center"
  },

  submitButton: {
    minHeight: 55,
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

  submitLoadingContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },

  buttonPressed: {
    opacity: 0.82
  },

  disabledButton: {
    opacity: 0.6
  },

  informationBox: {
    backgroundColor: "#E6EEF1",
    borderRadius: 18,
    padding: 17,
    marginTop: 17
  },

  informationTitle: {
    color: "#405A69",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 5
  },

  informationText: {
    color: "#5F737E",
    fontSize: 13,
    lineHeight: 19
  }
});