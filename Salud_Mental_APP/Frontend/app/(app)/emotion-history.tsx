import React, {
  useCallback,
  useEffect,
  useState
} from "react";

import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { useRouter } from "expo-router";

import {
  getApiErrorMessage
} from "../../services/api";

import {
  EmotionHistoryFilters,
  EmotionHistoryGroup,
  EmotionPeriod,
  EmotionSummary,
  getEmotionHistory,
  getEmotionStats
} from "../../services/emotionService";

interface EmotionOption {
  name: string;
  emoji: string;
}

interface PeriodOption {
  label: string;
  value: EmotionPeriod | null;
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

const PERIODS: PeriodOption[] = [
  {
    label: "Todos",
    value: null
  },
  {
    label: "Hoy",
    value: "hoy"
  },
  {
    label: "Semana",
    value: "semana"
  },
  {
    label: "Mes",
    value: "mes"
  }
];

const DATE_REGEX =
  /^\d{4}-\d{2}-\d{2}$/;

const EMPTY_SUMMARY: EmotionSummary = {
  totalRecords: 0,
  averageIntensity: 0,
  predominantEmotion: null,
  distribution: []
};

function isValidDate(
  value: string
): boolean {
  if (!DATE_REGEX.test(value)) {
    return false;
  }

  const [
    year,
    month,
    day
  ] = value
    .split("-")
    .map(Number);

  const date = new Date(
    year,
    month - 1,
    day
  );

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function formatDate(
  value: string
): string {
  const isoDate =
    value.match(
      /^\d{4}-\d{2}-\d{2}/
    )?.[0];

  const date = isoDate
    ? new Date(
        `${isoDate}T00:00:00`
      )
    : new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "es-EC",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    }
  );
}

function formatTime(
  value: string
): string {
  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "";
  }

  return date.toLocaleTimeString(
    "es-EC",
    {
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}

function getEmotionEmoji(
  emotion: string
): string {
  return (
    EMOTIONS.find(
      (item) =>
        item.name.toLowerCase() ===
        emotion.toLowerCase()
    )?.emoji ?? "📝"
  );
}

function getIntensityDescription(
  intensity: number
): string {
  if (intensity <= 3) {
    return "Baja";
  }

  if (intensity <= 6) {
    return "Media";
  }

  if (intensity <= 8) {
    return "Alta";
  }

  return "Muy alta";
}

export default function EmotionHistoryScreen() {
  const router = useRouter();

  const [
    selectedPeriod,
    setSelectedPeriod
  ] =
    useState<EmotionPeriod | null>(
      null
    );

  const [
    startDate,
    setStartDate
  ] = useState("");

  const [
    endDate,
    setEndDate
  ] = useState("");

  const [
    selectedEmotion,
    setSelectedEmotion
  ] = useState<string | null>(null);

  const [
    selectedIntensity,
    setSelectedIntensity
  ] = useState<number | null>(null);

  const [
    appliedFilters,
    setAppliedFilters
  ] = useState<EmotionHistoryFilters>(
    {}
  );

  const [
    groups,
    setGroups
  ] = useState<EmotionHistoryGroup[]>(
    []
  );

  const [
    summary,
    setSummary
  ] = useState<EmotionSummary>(
    EMPTY_SUMMARY
  );

  const [
    isLoading,
    setIsLoading
  ] = useState(true);

  const [
    isRefreshing,
    setIsRefreshing
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage
  ] = useState<string | null>(null);

  const loadData = useCallback(
    async (
      filters: EmotionHistoryFilters,
      refreshing = false
    ) => {
      setErrorMessage(null);

      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const [
          historyResult,
          statsResult
        ] = await Promise.allSettled([
          getEmotionHistory(filters),
          getEmotionStats(filters)
        ]);

        if (
          historyResult.status ===
          "rejected"
        ) {
          throw historyResult.reason;
        }

        setGroups(
          historyResult.value.groups
        );

        const historySummary =
          historyResult.value.summary;

    if (
    statsResult.status ===
    "fulfilled" &&
    (
        statsResult.value.totalRecords > 0 ||
        historySummary.totalRecords === 0
    )
    ) {
    setSummary(
        statsResult.value
    );
    } else {
    /*
    * Si el endpoint /stats devuelve cero,
    * pero el historial tiene registros,
    * se usa el resumen calculado desde
    * los registros visibles.
    */
    setSummary(historySummary);
    }
      } catch (error) {
        setGroups([]);
        setSummary(EMPTY_SUMMARY);

        setErrorMessage(
          getApiErrorMessage(
            error,
            "No fue posible consultar el historial emocional"
          )
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadData({});
  }, [loadData]);

  function buildFilters():
    EmotionHistoryFilters {
    const filters:
      EmotionHistoryFilters = {};

    if (selectedPeriod) {
      filters.periodo =
        selectedPeriod;
    }

    if (startDate.trim()) {
      filters.fecha_inicio =
        startDate.trim();
    }

    if (endDate.trim()) {
      filters.fecha_fin =
        endDate.trim();
    }

    if (selectedEmotion) {
      filters.emocion =
        selectedEmotion;
    }

    if (
      selectedIntensity !== null
    ) {
      filters.intensidad =
        selectedIntensity;
    }

    return filters;
  }

  async function handleApplyFilters() {
    setErrorMessage(null);

    const normalizedStart =
      startDate.trim();

    const normalizedEnd =
      endDate.trim();

    if (
      normalizedStart &&
      !isValidDate(normalizedStart)
    ) {
      setErrorMessage(
        "La fecha inicial debe tener el formato YYYY-MM-DD y ser válida"
      );
      return;
    }

    if (
      normalizedEnd &&
      !isValidDate(normalizedEnd)
    ) {
      setErrorMessage(
        "La fecha final debe tener el formato YYYY-MM-DD y ser válida"
      );
      return;
    }

    if (
      normalizedStart &&
      normalizedEnd &&
      normalizedStart > normalizedEnd
    ) {
      setErrorMessage(
        "La fecha inicial no puede ser posterior a la fecha final"
      );
      return;
    }

    const filters = buildFilters();

    setAppliedFilters(filters);

    await loadData(filters);
  }

  async function handleClearFilters() {
    setSelectedPeriod(null);
    setStartDate("");
    setEndDate("");
    setSelectedEmotion(null);
    setSelectedIntensity(null);
    setAppliedFilters({});
    setErrorMessage(null);

    await loadData({});
  }

  function handlePeriodSelection(
    period: EmotionPeriod | null
  ) {
    setSelectedPeriod(period);

    if (period) {
      setStartDate("");
      setEndDate("");
    }
  }

  function handleDateChange(
    type: "start" | "end",
    value: string
  ) {
    setSelectedPeriod(null);

    if (type === "start") {
      setStartDate(value);
    } else {
      setEndDate(value);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void loadData(
                appliedFilters,
                true
              );
            }}
            colors={["#526D82"]}
            tintColor="#526D82"
          />
        }
      >
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>
            ‹ Volver
          </Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.title}>
            Historial emocional
          </Text>

          <Text style={styles.subtitle}>
            Revisa tus registros e identifica
            patrones en tus emociones.
          </Text>
        </View>

        <View style={styles.filtersCard}>
          <Text style={styles.cardTitle}>
            Filtros
          </Text>

          <Text style={styles.filterLabel}>
            Periodo
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.horizontalOptions
            }
          >
            {PERIODS.map((period) => {
              const isSelected =
                selectedPeriod ===
                period.value;

              return (
                <Pressable
                  key={period.label}
                  onPress={() => {
                    handlePeriodSelection(
                      period.value
                    );
                  }}
                  style={[
                    styles.periodButton,
                    isSelected &&
                      styles.optionSelected
                  ]}
                >
                  <Text
                    style={[
                      styles.periodText,
                      isSelected &&
                        styles.optionTextSelected
                    ]}
                  >
                    {period.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.filterLabel}>
            Rango personalizado
          </Text>

          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>
                Desde
              </Text>

              <TextInput
                value={startDate}
                onChangeText={(value) => {
                  handleDateChange(
                    "start",
                    value
                  );
                }}
                style={styles.dateInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#87939A"
                maxLength={10}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.dateField}>
              <Text style={styles.dateLabel}>
                Hasta
              </Text>

              <TextInput
                value={endDate}
                onChangeText={(value) => {
                  handleDateChange(
                    "end",
                    value
                  );
                }}
                style={styles.dateInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#87939A"
                maxLength={10}
                autoCapitalize="none"
              />
            </View>
          </View>

          <Text style={styles.filterLabel}>
            Emoción
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.horizontalOptions
            }
          >
            <Pressable
              onPress={() => {
                setSelectedEmotion(null);
              }}
              style={[
                styles.emotionFilterButton,
                selectedEmotion === null &&
                  styles.optionSelected
              ]}
            >
              <Text
                style={[
                  styles.emotionFilterText,
                  selectedEmotion === null &&
                    styles.optionTextSelected
                ]}
              >
                Todas
              </Text>
            </Pressable>

            {EMOTIONS.map((emotion) => {
              const isSelected =
                selectedEmotion ===
                emotion.name;

              return (
                <Pressable
                  key={emotion.name}
                  onPress={() => {
                    setSelectedEmotion(
                      emotion.name
                    );
                  }}
                  style={[
                    styles.emotionFilterButton,
                    isSelected &&
                      styles.optionSelected
                  ]}
                >
                  <Text
                    style={[
                      styles.emotionFilterText,
                      isSelected &&
                        styles.optionTextSelected
                    ]}
                  >
                    {emotion.emoji}{" "}
                    {emotion.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.filterLabel}>
            Intensidad
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={
              false
            }
            contentContainerStyle={
              styles.intensityOptions
            }
          >
            <Pressable
              onPress={() => {
                setSelectedIntensity(null);
              }}
              style={[
                styles.intensityButton,
                selectedIntensity === null &&
                  styles.optionSelected
              ]}
            >
              <Text
                style={[
                  styles.intensityText,
                  selectedIntensity === null &&
                    styles.optionTextSelected
                ]}
              >
                Todas
              </Text>
            </Pressable>

            {Array.from(
              {
                length: 10
              },
              (_, index) => index + 1
            ).map((value) => {
              const isSelected =
                selectedIntensity === value;

              return (
                <Pressable
                  key={value}
                  onPress={() => {
                    setSelectedIntensity(
                      value
                    );
                  }}
                  style={[
                    styles.intensityNumber,
                    isSelected &&
                      styles.optionSelected
                  ]}
                >
                  <Text
                    style={[
                      styles.intensityText,
                      isSelected &&
                        styles.optionTextSelected
                    ]}
                  >
                    {value}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>
                {errorMessage}
              </Text>
            </View>
          ) : null}

          <View style={styles.filterActions}>
            <Pressable
              onPress={() => {
                void handleClearFilters();
              }}
              disabled={isLoading}
              style={styles.clearButton}
            >
              <Text style={styles.clearText}>
                Limpiar
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                void handleApplyFilters();
              }}
              disabled={isLoading}
              style={styles.applyButton}
            >
              {isLoading ? (
                <ActivityIndicator
                  color="#FFFFFF"
                />
              ) : (
                <Text
                  style={styles.applyText}
                >
                  Aplicar filtros
                </Text>
              )}
            </Pressable>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator
              size="large"
              color="#526D82"
            />

            <Text style={styles.loadingText}>
              Consultando historial...
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>
              Resumen
            </Text>

            <View style={styles.summaryGrid}>
              <View style={styles.summaryCard}>
                <Text
                  style={styles.summaryValue}
                >
                  {summary.totalRecords}
                </Text>

                <Text
                  style={styles.summaryLabel}
                >
                  Registros
                </Text>
              </View>

              <View style={styles.summaryCard}>
                <Text
                  style={styles.summaryValue}
                >
                  {summary.averageIntensity
                    .toFixed(1)}
                </Text>

                <Text
                  style={styles.summaryLabel}
                >
                  Intensidad promedio
                </Text>
              </View>

              <View
                style={[
                  styles.summaryCard,
                  styles.predominantCard
                ]}
              >
                <Text
                  style={
                    styles.predominantEmoji
                  }
                >
                  {summary.predominantEmotion
                    ? getEmotionEmoji(
                        summary.predominantEmotion
                      )
                    : "—"}
                </Text>

                <View style={styles.predominantText}>
                  <Text
                    style={
                      styles.predominantValue
                    }
                  >
                    {summary.predominantEmotion ??
                      "Sin datos"}
                  </Text>

                  <Text
                    style={styles.summaryLabel}
                  >
                    Emoción predominante
                  </Text>
                </View>
              </View>
            </View>

            {summary.distribution.length >
            0 ? (
              <View
                style={styles.distributionCard}
              >
                <Text
                  style={
                    styles.distributionTitle
                  }
                >
                  Distribución de emociones
                </Text>

                {summary.distribution.map(
                  (item) => {
                    const percentage =
                      summary.totalRecords > 0
                        ? Math.round(
                            (item.total /
                              summary.totalRecords) *
                              100
                          )
                        : 0;

                    return (
                      <View
                        key={item.emotion}
                        style={
                          styles.distributionRow
                        }
                      >
                        <Text
                          style={
                            styles.distributionEmotion
                          }
                        >
                          {getEmotionEmoji(
                            item.emotion
                          )}{" "}
                          {item.emotion}
                        </Text>

                        <Text
                          style={
                            styles.distributionTotal
                          }
                        >
                          {item.total} ·{" "}
                          {percentage}%
                        </Text>
                      </View>
                    );
                  }
                )}
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>
              Registros
            </Text>

            {groups.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyEmoji}>
                  📭
                </Text>

                <Text style={styles.emptyTitle}>
                  No existen registros
                </Text>

                <Text style={styles.emptyText}>
                  No se encontraron emociones
                  con los filtros seleccionados.
                </Text>
              </View>
            ) : (
              groups.map((group) => (
                <View
                  key={group.date}
                  style={styles.dateGroup}
                >
                  <Text
                    style={styles.groupDate}
                  >
                    {formatDate(group.date)}
                  </Text>

                  {group.records.map(
                    (record) => (
                      <View
                        key={record.id}
                        style={
                          styles.emotionCard
                        }
                      >
                        <View
                          style={
                            styles.emotionHeader
                          }
                        >
                          <View
                            style={
                              styles.emotionIdentity
                            }
                          >
                            <Text
                              style={
                                styles.recordEmoji
                              }
                            >
                              {getEmotionEmoji(
                                record.mood
                              )}
                            </Text>

                            <View>
                              <Text
                                style={
                                  styles.recordMood
                                }
                              >
                                {record.mood}
                              </Text>

                              <Text
                                style={
                                  styles.recordTime
                                }
                              >
                                {formatTime(
                                  record.created_at
                                )}
                              </Text>
                            </View>
                          </View>

                          <View
                            style={
                              styles.intensityBadge
                            }
                          >
                            <Text
                              style={
                                styles.intensityBadgeValue
                              }
                            >
                              {record.intensity}/10
                            </Text>

                            <Text
                              style={
                                styles.intensityBadgeLabel
                              }
                            >
                              {getIntensityDescription(
                                Number(
                                  record.intensity
                                )
                              )}
                            </Text>
                          </View>
                        </View>

                        <Text
                          style={
                            record.note
                              ? styles.recordNote
                              : styles.emptyNote
                          }
                        >
                          {record.note ||
                            "Sin descripción adicional."}
                        </Text>
                      </View>
                    )
                  )}
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F2F6F7"
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

  filtersCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 18,
    marginBottom: 25,
    elevation: 3,
    shadowColor: "#000000",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4
    }
  },

  cardTitle: {
    color: "#243642",
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 17
  },

  filterLabel: {
    color: "#40515A",
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 9,
    marginTop: 5
  },

  horizontalOptions: {
    gap: 9,
    paddingBottom: 15
  },

  periodButton: {
    borderWidth: 1,
    borderColor: "#D5DEE2",
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 9,
    backgroundColor: "#F8FAFB"
  },

  periodText: {
    color: "#60717A",
    fontSize: 13,
    fontWeight: "700"
  },

  optionSelected: {
    backgroundColor: "#526D82",
    borderColor: "#526D82"
  },

  optionTextSelected: {
    color: "#FFFFFF"
  },

  dateRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14
  },

  dateField: {
    flex: 1
  },

  dateLabel: {
    color: "#74828A",
    fontSize: 11,
    marginBottom: 6
  },

  dateInput: {
    minHeight: 47,
    borderWidth: 1,
    borderColor: "#D5DEE2",
    borderRadius: 13,
    backgroundColor: "#F8FAFB",
    paddingHorizontal: 12,
    color: "#243642",
    fontSize: 13
  },

  emotionFilterButton: {
    borderWidth: 1,
    borderColor: "#D5DEE2",
    borderRadius: 18,
    paddingHorizontal: 13,
    paddingVertical: 9,
    backgroundColor: "#F8FAFB"
  },

  emotionFilterText: {
    color: "#60717A",
    fontSize: 13,
    fontWeight: "700"
  },

  intensityOptions: {
    gap: 8,
    paddingBottom: 15
  },

  intensityButton: {
    minWidth: 60,
    height: 39,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D5DEE2",
    borderRadius: 20,
    backgroundColor: "#F8FAFB",
    paddingHorizontal: 10
  },

  intensityNumber: {
    width: 39,
    height: 39,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D5DEE2",
    borderRadius: 20,
    backgroundColor: "#F8FAFB"
  },

  intensityText: {
    color: "#60717A",
    fontSize: 13,
    fontWeight: "800"
  },

  errorBox: {
    backgroundColor: "#FDECEC",
    borderRadius: 13,
    padding: 13,
    marginBottom: 14
  },

  errorText: {
    color: "#A33232",
    fontSize: 13,
    lineHeight: 19
  },

  filterActions: {
    flexDirection: "row",
    gap: 10
  },

  clearButton: {
    flex: 1,
    minHeight: 49,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#526D82",
    borderRadius: 14
  },

  clearText: {
    color: "#526D82",
    fontSize: 14,
    fontWeight: "800"
  },

  applyButton: {
    flex: 1.6,
    minHeight: 49,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#526D82",
    borderRadius: 14
  },

  applyText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800"
  },

  loadingBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 55
  },

  loadingText: {
    color: "#718087",
    fontSize: 13,
    marginTop: 13
  },

  sectionTitle: {
    color: "#243642",
    fontSize: 19,
    fontWeight: "800",
    marginBottom: 13
  },

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 11,
    marginBottom: 18
  },

  summaryCard: {
    width: "48%",
    minHeight: 105,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    elevation: 2,
    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 3
    }
  },

  summaryValue: {
    color: "#405F70",
    fontSize: 27,
    fontWeight: "900",
    marginBottom: 5
  },

  summaryLabel: {
    color: "#718087",
    fontSize: 11,
    textAlign: "center"
  },

  predominantCard: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingHorizontal: 22
  },

  predominantEmoji: {
    fontSize: 36,
    marginRight: 16
  },

  predominantText: {
    flex: 1,
    alignItems: "flex-start"
  },

  predominantValue: {
    color: "#405F70",
    fontSize: 19,
    fontWeight: "900",
    marginBottom: 4
  },

  distributionCard: {
    backgroundColor: "#E6EEF1",
    borderRadius: 18,
    padding: 17,
    marginBottom: 24
  },

  distributionTitle: {
    color: "#405A69",
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 12
  },

  distributionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#D4E0E5"
  },

  distributionEmotion: {
    color: "#52636D",
    fontSize: 13,
    fontWeight: "700"
  },

  distributionTotal: {
    color: "#405A69",
    fontSize: 13,
    fontWeight: "800"
  },

  emptyBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    alignItems: "center",
    paddingVertical: 35,
    paddingHorizontal: 22
  },

  emptyEmoji: {
    fontSize: 38,
    marginBottom: 10
  },

  emptyTitle: {
    color: "#243642",
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 6
  },

  emptyText: {
    color: "#718087",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center"
  },

  dateGroup: {
    marginBottom: 20
  },

  groupDate: {
    color: "#536873",
    fontSize: 14,
    fontWeight: "800",
    textTransform: "capitalize",
    marginBottom: 10
  },

  emotionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 19,
    padding: 17,
    marginBottom: 11,
    elevation: 2,
    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 3
    }
  },

  emotionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 13
  },

  emotionIdentity: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center"
  },

  recordEmoji: {
    fontSize: 30,
    marginRight: 11
  },

  recordMood: {
    color: "#243642",
    fontSize: 16,
    fontWeight: "800"
  },

  recordTime: {
    color: "#87939A",
    fontSize: 11,
    marginTop: 2
  },

  intensityBadge: {
    backgroundColor: "#E5EEF2",
    borderRadius: 13,
    paddingHorizontal: 11,
    paddingVertical: 7,
    alignItems: "center"
  },

  intensityBadgeValue: {
    color: "#405F70",
    fontSize: 14,
    fontWeight: "900"
  },

  intensityBadgeLabel: {
    color: "#718087",
    fontSize: 9,
    marginTop: 1
  },

  recordNote: {
    color: "#5E6E76",
    fontSize: 13,
    lineHeight: 20
  },

  emptyNote: {
    color: "#919BA0",
    fontSize: 13,
    fontStyle: "italic"
  }
});