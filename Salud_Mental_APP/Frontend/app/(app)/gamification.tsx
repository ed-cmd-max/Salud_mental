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
  View
} from "react-native";

import {
  useRouter
} from "expo-router";

import {
  getApiErrorMessage
} from "../../services/api";

import {
  Achievement,
  AchievementsResult,
  GamificationProgress,
  getAchievements,
  getGamificationProgress
} from "../../services/gamificationService";

const EMPTY_PROGRESS:
  GamificationProgress = {
    points: 0,
    level: 1,
    activities_completed: 0,
    streak_days: 0,
    last_activity_date: null,
    updated_at: null,
    points_in_current_level: 0,
    points_to_next_level: 100,
    next_level_points: 100,
    progress_percentage: 0
  };

const EMPTY_ACHIEVEMENTS:
  AchievementsResult = {
    total: 0,
    unlocked_count: 0,
    pending_count: 0,
    achievements: []
  };

function formatDate(
  value: string | null
): string {
  if (!value) {
    return "Sin actividad";
  }

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
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    "es-EC",
    {
      day: "numeric",
      month: "long",
      year: "numeric"
    }
  );
}

function formatDateTime(
  value: string | null
): string {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleString(
    "es-EC",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}

function getAchievementEmoji(
  achievement: Achievement
): string {
  switch (
    achievement.criterion_type
  ) {
    case "emotion_count":
      return "😊";

    case "activity_count":
      return "🌿";

    case "level":
      return "⭐";

    case "streak_days":
      return "🔥";

    case "points":
      return "🏆";

    default:
      return "🎖️";
  }
}

function getCriterionText(
  achievement: Achievement
): string {
  const requiredValue =
    achievement.criterion_type ===
      "points" &&
    achievement.points_required > 0
      ? achievement.points_required
      : achievement.criterion_value;

  switch (
    achievement.criterion_type
  ) {
    case "emotion_count":
      return requiredValue === 1
        ? "Registrar una emoción"
        : `Registrar ${requiredValue} emociones`;

    case "activity_count":
      return requiredValue === 1
        ? "Completar una actividad de autocuidado y autorreflexión"
        : `Completar ${requiredValue} actividades de autocuidado y autorreflexión diferentes`;

    case "level":
      return `Alcanzar el nivel ${requiredValue}`;

    case "streak_days":
      return requiredValue === 1
        ? "Mantener una racha de 1 día"
        : `Mantener una racha de ${requiredValue} días`;

    case "points":
      return requiredValue === 1
        ? "Acumular 1 punto"
        : `Acumular ${requiredValue} puntos`;

    default:
      return "Cumplir el criterio del logro";
  }
}

interface StatCardProps {
  emoji: string;
  value: string | number;
  label: string;
}

function StatCard({
  emoji,
  value,
  label
}: StatCardProps) {
  return (
    <View
      style={styles.statCard}
      accessible
      accessibilityLabel={`${value} ${label}`}
    >
      <Text
        style={styles.statEmoji}
      >
        {emoji}
      </Text>

      <Text
        style={styles.statValue}
      >
        {value}
      </Text>

      <Text
        style={styles.statLabel}
      >
        {label}
      </Text>
    </View>
  );
}

export default function GamificationScreen() {
  const router = useRouter();

  const [
    progress,
    setProgress
  ] =
    useState<GamificationProgress>(
      EMPTY_PROGRESS
    );

  const [
    achievementsResult,
    setAchievementsResult
  ] =
    useState<AchievementsResult>(
      EMPTY_ACHIEVEMENTS
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
  ] =
    useState<string | null>(
      null
    );

  const loadGamification =
    useCallback(
      async (
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
            progressResult,
            achievements
          ] = await Promise.all([
            getGamificationProgress(),
            getAchievements()
          ]);

          setProgress(
            progressResult
          );

          setAchievementsResult(
            achievements
          );
        } catch (error) {
          setErrorMessage(
            getApiErrorMessage(
              error,
              "No fue posible consultar la gamificación"
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
    void loadGamification();
  }, [loadGamification]);

  const progressPercentage =
    Math.min(
      Math.max(
        Number(
          progress.progress_percentage
        ),
        0
      ),
      100
    );

  const sortedAchievements =
    [
      ...achievementsResult
        .achievements
    ].sort(
      (first, second) => {
        if (
          first.unlocked ===
          second.unlocked
        ) {
          return (
            first.id -
            second.id
          );
        }

        return first.unlocked
          ? -1
          : 1;
      }
    );

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
        refreshControl={
          <RefreshControl
            refreshing={
              isRefreshing
            }
            onRefresh={() => {
              void loadGamification(
                true
              );
            }}
            colors={[
              "#526D82"
            ]}
            tintColor="#526D82"
          />
        }
      >
        <Pressable
          onPress={() =>
            router.back()
          }
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={styles.backButton}
          hitSlop={10}
        >
          <Text
            style={styles.backText}
          >
            ‹ Volver
          </Text>
        </Pressable>

        <View
          style={styles.header}
        >
          <Text
            style={styles.title}
          >
            Mi progreso
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            Consulta tus puntos, racha,
            nivel y logros desbloqueados.
          </Text>
        </View>

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
              Consultando progreso...
            </Text>
          </View>
        ) : null}

        {!isLoading &&
        errorMessage ? (
          <View
            style={styles.errorBox}
          >
            <Text
              style={
                styles.errorTitle
              }
            >
              No se pudo cargar el
              progreso
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
                void loadGamification();
              }}
              style={
                styles.retryButton
              }
              accessibilityRole="button"
              accessibilityLabel="Intentar nuevamente"
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
        !errorMessage ? (
          <>
            <View
              style={
                styles.levelCard
              }
              accessible
              accessibilityLabel={`Nivel ${progress.level}, ${progress.points} puntos, ${Math.round(
                progressPercentage
              )} por ciento de progreso`}
            >
              <View
                style={
                  styles.levelHeader
                }
              >
                <View>
                  <Text
                    style={
                      styles.levelEyebrow
                    }
                  >
                    NIVEL ACTUAL
                  </Text>

                  <Text
                    style={
                      styles.levelNumber
                    }
                  >
                    {progress.level}
                  </Text>
                </View>

                <View
                  style={
                    styles.pointsBadge
                  }
                >
                  <Text
                    style={
                      styles.pointsBadgeValue
                    }
                  >
                    {progress.points}
                  </Text>

                  <Text
                    style={
                      styles.pointsBadgeLabel
                    }
                  >
                    {progress.points === 1
                      ? "punto"
                      : "puntos"}
                  </Text>
                </View>
              </View>

              <View
                style={
                  styles.progressInfo
                }
              >
                <Text
                  style={
                    styles.progressInfoText
                  }
                >
                  Progreso al nivel{" "}
                  {progress.level + 1}
                </Text>

                <Text
                  style={
                    styles.progressPercent
                  }
                >
                  {Math.round(
                    progressPercentage
                  )}
                  %
                </Text>
              </View>

              <View
                style={
                  styles.progressTrack
                }
              >
                <View
                  style={[
                    styles.progressFill,
                    {
                      width:
                        `${progressPercentage}%`
                    }
                  ]}
                />
              </View>

              <View
                style={
                  styles.progressFooter
                }
              >
                <Text
                  style={
                    styles.progressFooterText
                  }
                >
                  {
                    progress
                      .points_in_current_level
                  }{" "}
                  {progress
                    .points_in_current_level ===
                  1
                    ? "punto"
                    : "puntos"}{" "}
                  en este nivel
                </Text>

                <Text
                  style={
                    styles.progressFooterText
                  }
                >
                  Faltan{" "}
                  {
                    progress
                      .points_to_next_level
                  }{" "}
                  {progress
                    .points_to_next_level ===
                  1
                    ? "punto"
                    : "puntos"}
                </Text>
              </View>
            </View>

            <View
              style={
                styles.statsGrid
              }
            >
              <StatCard
                emoji="🔥"
                value={
                  progress.streak_days
                }
                label={
                  progress.streak_days ===
                  1
                    ? "día de racha"
                    : "días de racha"
                }
              />

              <StatCard
                emoji="🌿"
                value={
                  progress
                    .activities_completed
                }
                label={
                  progress
                    .activities_completed ===
                  1
                    ? "actividad diferente"
                    : "actividades diferentes"
                }
              />

              <StatCard
                emoji="🏆"
                value={
                  achievementsResult
                    .unlocked_count
                }
                label={
                  achievementsResult
                    .unlocked_count ===
                  1
                    ? "logro obtenido"
                    : "logros obtenidos"
                }
              />

              <StatCard
                emoji="🎯"
                value={
                  achievementsResult.total
                }
                label={
                  achievementsResult.total ===
                  1
                    ? "logro disponible"
                    : "logros disponibles"
                }
              />
            </View>

            <View
              style={
                styles.lastActivityCard
              }
            >
              <View
                style={
                  styles.lastActivityIcon
                }
              >
                <Text
                  style={
                    styles.lastActivityEmoji
                  }
                >
                  📅
                </Text>
              </View>

              <View
                style={
                  styles.lastActivityContent
                }
              >
                <Text
                  style={
                    styles.lastActivityLabel
                  }
                >
                  Última actividad
                </Text>

                <Text
                  style={
                    styles.lastActivityValue
                  }
                >
                  {formatDate(
                    progress
                      .last_activity_date
                  )}
                </Text>
              </View>
            </View>

            <View
              style={
                styles.achievementHeader
              }
            >
              <View>
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Logros
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  {
                    achievementsResult
                      .unlocked_count
                  }{" "}
                  de{" "}
                  {
                    achievementsResult
                      .total
                  }{" "}
                  desbloqueados
                </Text>
              </View>

              <View
                style={
                  styles.achievementCounter
                }
                accessible
                accessibilityLabel={`${achievementsResult.unlocked_count} de ${achievementsResult.total} logros desbloqueados`}
              >
                <Text
                  style={
                    styles.achievementCounterText
                  }
                >
                  {
                    achievementsResult
                      .unlocked_count
                  }
                  /
                  {
                    achievementsResult
                      .total
                  }
                </Text>
              </View>
            </View>

            {sortedAchievements.length ===
            0 ? (
              <View
                style={
                  styles.emptyBox
                }
              >
                <Text
                  style={
                    styles.emptyEmoji
                  }
                >
                  🎖️
                </Text>

                <Text
                  style={
                    styles.emptyTitle
                  }
                >
                  No hay logros disponibles
                </Text>

                <Text
                  style={
                    styles.emptyText
                  }
                >
                  El catálogo de logros se
                  encuentra vacío.
                </Text>
              </View>
            ) : (
              sortedAchievements.map(
                (achievement) => (
                  <View
                    key={
                      achievement.id
                    }
                    accessible
                    accessibilityLabel={`${achievement.title}. ${
                      achievement.unlocked
                        ? "Obtenido"
                        : "Pendiente"
                    }. ${getCriterionText(
                      achievement
                    )}`}
                    style={[
                      styles
                        .achievementCard,

                      achievement.unlocked &&
                        styles
                          .achievementCardUnlocked
                    ]}
                  >
                    <View
                      style={[
                        styles
                          .achievementIcon,

                        achievement.unlocked &&
                          styles
                            .achievementIconUnlocked
                      ]}
                    >
                      <Text
                        style={
                          styles
                            .achievementEmoji
                        }
                      >
                        {getAchievementEmoji(
                          achievement
                        )}
                      </Text>
                    </View>

                    <View
                      style={
                        styles
                          .achievementContent
                      }
                    >
                      <View
                        style={
                          styles
                            .achievementTitleRow
                        }
                      >
                        <Text
                          style={
                            styles
                              .achievementTitle
                          }
                        >
                          {
                            achievement.title
                          }
                        </Text>

                        <View
                          style={[
                            styles
                              .achievementStatus,

                            achievement.unlocked
                              ? styles
                                  .unlockedBadge
                              : styles
                                  .pendingBadge
                          ]}
                        >
                          <Text
                            style={[
                              styles
                                .achievementStatusText,

                              achievement.unlocked
                                ? styles
                                    .unlockedText
                                : styles
                                    .pendingText
                            ]}
                          >
                            {achievement.unlocked
                              ? "Obtenido"
                              : "Pendiente"}
                          </Text>
                        </View>
                      </View>

                      <Text
                        style={
                          styles
                            .achievementDescription
                        }
                      >
                        {
                          achievement.description
                        }
                      </Text>

                      <Text
                        style={
                          styles
                            .achievementCriterion
                        }
                      >
                        {getCriterionText(
                          achievement
                        )}
                      </Text>

                      {achievement.unlocked &&
                      achievement.unlocked_at ? (
                        <Text
                          style={
                            styles
                              .unlockedDate
                          }
                        >
                          Desbloqueado:{" "}
                          {formatDateTime(
                            achievement
                              .unlocked_at
                          )}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                )
              )
            )}

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
                ¿Cómo avanzar?
              </Text>

              <Text
                style={
                  styles.informationText
                }
              >
                Registra tus emociones y
                realiza actividades de
                autocuidado y
                autorreflexión. Tu progreso
                se actualizará
                automáticamente con tus
                puntos, nivel, racha y
                logros.
              </Text>
            </View>
          </>
        ) : null}
      </ScrollView>
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

    loadingBox: {
      alignItems:
        "center",
      paddingVertical: 65
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
      minHeight: 45,
      alignItems:
        "center",
      justifyContent:
        "center",
      borderWidth: 1,
      borderColor:
        "#A14848",
      borderRadius: 13,
      marginTop: 14
    },

    retryText: {
      color: "#8E3030",
      fontSize: 13,
      fontWeight: "800"
    },

    levelCard: {
      backgroundColor:
        "#526D82",
      borderRadius: 24,
      padding: 21,
      marginBottom: 16
    },

    levelHeader: {
      flexDirection: "row",
      alignItems:
        "flex-start",
      justifyContent:
        "space-between"
    },

    levelEyebrow: {
      color: "#D9E5EA",
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 1.2
    },

    levelNumber: {
      color: "#FFFFFF",
      fontSize: 47,
      fontWeight: "900",
      marginTop: 1
    },

    pointsBadge: {
      minWidth: 92,
      alignItems:
        "center",
      backgroundColor:
        "#FFFFFF",
      borderRadius: 17,
      paddingHorizontal: 15,
      paddingVertical: 11
    },

    pointsBadgeValue: {
      color: "#405F70",
      fontSize: 22,
      fontWeight: "900"
    },

    pointsBadgeLabel: {
      color: "#718087",
      fontSize: 12,
      marginTop: 2
    },

    progressInfo: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      marginTop: 18,
      marginBottom: 8
    },

    progressInfoText: {
      color: "#E8F0F3",
      fontSize: 12,
      fontWeight: "700"
    },

    progressPercent: {
      color: "#FFFFFF",
      fontSize: 12,
      fontWeight: "900"
    },

    progressTrack: {
      height: 11,
      backgroundColor:
        "#7890A0",
      borderRadius: 7,
      overflow: "hidden"
    },

    progressFill: {
      height: "100%",
      backgroundColor:
        "#FFFFFF",
      borderRadius: 7
    },

    progressFooter: {
      flexDirection: "row",
      justifyContent:
        "space-between",
      marginTop: 8,
      gap: 10
    },

    progressFooterText: {
      flex: 1,
      color: "#DCE7EC",
      fontSize: 12
    },

    statsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent:
        "space-between",
      rowGap: 11,
      marginBottom: 16
    },

    statCard: {
      width: "48.5%",
      minHeight: 125,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "#FFFFFF",
      borderRadius: 19,
      padding: 14,
      elevation: 2,
      shadowColor:
        "#000000",
      shadowOpacity: 0.04,
      shadowRadius: 7,
      shadowOffset: {
        width: 0,
        height: 3
      }
    },

    statEmoji: {
      fontSize: 28,
      marginBottom: 5
    },

    statValue: {
      color: "#405F70",
      fontSize: 24,
      fontWeight: "900"
    },

    statLabel: {
      color: "#718087",
      fontSize: 12,
      lineHeight: 17,
      textAlign: "center",
      marginTop: 3
    },

    lastActivityCard: {
      flexDirection: "row",
      alignItems:
        "center",
      backgroundColor:
        "#E6EEF1",
      borderRadius: 18,
      padding: 16,
      marginBottom: 25
    },

    lastActivityIcon: {
      width: 48,
      height: 48,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "#FFFFFF",
      borderRadius: 15,
      marginRight: 13
    },

    lastActivityEmoji: {
      fontSize: 23
    },

    lastActivityContent: {
      flex: 1
    },

    lastActivityLabel: {
      color: "#718087",
      fontSize: 12,
      marginBottom: 3
    },

    lastActivityValue: {
      color: "#405A69",
      fontSize: 15,
      fontWeight: "800",
      textTransform:
        "capitalize"
    },

    achievementHeader: {
      flexDirection: "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      marginBottom: 13
    },

    sectionTitle: {
      color: "#243642",
      fontSize: 20,
      fontWeight: "800",
      marginBottom: 3
    },

    sectionSubtitle: {
      color: "#718087",
      fontSize: 12
    },

    achievementCounter: {
      minWidth: 47,
      height: 34,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "#DDE8EC",
      borderRadius: 17,
      paddingHorizontal: 10
    },

    achievementCounterText: {
      color: "#526D82",
      fontSize: 12,
      fontWeight: "900"
    },

    achievementCard: {
      flexDirection: "row",
      backgroundColor:
        "#FFFFFF",
      borderRadius: 19,
      padding: 16,
      marginBottom: 12,
      borderWidth: 1,
      borderColor:
        "#E3E9EC",
      opacity: 0.78
    },

    achievementCardUnlocked: {
      borderColor:
        "#B7D7C0",
      backgroundColor:
        "#F7FCF8",
      opacity: 1
    },

    achievementIcon: {
      width: 53,
      height: 53,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "#EDF1F3",
      borderRadius: 17,
      marginRight: 13
    },

    achievementIconUnlocked: {
      backgroundColor:
        "#DFF0E4"
    },

    achievementEmoji: {
      fontSize: 26
    },

    achievementContent: {
      flex: 1
    },

    achievementTitleRow: {
      flexDirection: "row",
      alignItems:
        "flex-start",
      justifyContent:
        "space-between"
    },

    achievementTitle: {
      flex: 1,
      color: "#243642",
      fontSize: 15,
      fontWeight: "800",
      paddingRight: 8
    },

    achievementStatus: {
      borderRadius: 11,
      paddingHorizontal: 8,
      paddingVertical: 5
    },

    unlockedBadge: {
      backgroundColor:
        "#DFF0E4"
    },

    pendingBadge: {
      backgroundColor:
        "#EDF1F3"
    },

    achievementStatusText: {
      fontSize: 12,
      fontWeight: "900"
    },

    unlockedText: {
      color: "#3C6C49"
    },

    pendingText: {
      color: "#75848B"
    },

    achievementDescription: {
      color: "#68777F",
      fontSize: 12,
      lineHeight: 18,
      marginTop: 7
    },

    achievementCriterion: {
      color: "#526D82",
      fontSize: 12,
      fontWeight: "800",
      marginTop: 8
    },

    unlockedDate: {
      color: "#66806D",
      fontSize: 12,
      marginTop: 6
    },

    emptyBox: {
      alignItems:
        "center",
      backgroundColor:
        "#FFFFFF",
      borderRadius: 20,
      padding: 32
    },

    emptyEmoji: {
      fontSize: 38,
      marginBottom: 10
    },

    emptyTitle: {
      color: "#243642",
      fontSize: 17,
      fontWeight: "800",
      marginBottom: 6,
      textAlign: "center"
    },

    emptyText: {
      color: "#718087",
      fontSize: 13,
      textAlign: "center"
    },

    informationBox: {
      backgroundColor:
        "#E6EEF1",
      borderRadius: 18,
      padding: 17,
      marginTop: 10
    },

    informationTitle: {
      color: "#405A69",
      fontSize: 14,
      fontWeight: "800",
      marginBottom: 5
    },

    informationText: {
      color: "#5F737E",
      fontSize: 12,
      lineHeight: 18
    }
  });