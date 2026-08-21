import React, {
  useCallback,
  useEffect,
  useRef,
  useState
} from "react";

import {
  ActivityIndicator,
  Animated,
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
  Activity,
  getActivities
} from "../../services/activityService";

function getCategoryEmoji(
  category: string | null
): string {
  const normalizedCategory =
    category?.toLowerCase() ?? "";

  if (
    normalizedCategory.includes(
      "respir"
    )
  ) {
    return "🌬️";
  }

  if (
    normalizedCategory.includes(
      "cognitivo"
    ) ||
    normalizedCategory.includes(
      "pensamiento"
    )
  ) {
    return "🧠";
  }

  if (
    normalizedCategory.includes(
      "relaj"
    ) ||
    normalizedCategory.includes(
      "atención"
    )
  ) {
    return "🧘";
  }

  if (
    normalizedCategory.includes(
      "emocional"
    )
  ) {
    return "📝";
  }

  return "🌿";
}

function formatDuration(
  value: number
): string {
  const duration =
    Number(value);

  if (duration === 1) {
    return "1 minuto";
  }

  return `${duration} minutos`;
}

interface ActivityCardProps {
  activity: Activity;
  onPress: () => void;
}

function ActivityCard({
  activity,
  onPress
}: ActivityCardProps) {
  const scale =
    useRef(
      new Animated.Value(1)
    ).current;

  function handlePressIn() {
    Animated.spring(
      scale,
      {
        toValue: 0.985,
        useNativeDriver: true,
        speed: 30,
        bounciness: 0
      }
    ).start();
  }

  function handlePressOut() {
    Animated.spring(
      scale,
      {
        toValue: 1,
        useNativeDriver: true,
        speed: 30,
        bounciness: 3
      }
    ).start();
  }

  const category =
    activity.category ||
    "Actividad de autocuidado y autorreflexión";

  return (
    <Animated.View
      style={{
        transform: [
          {
            scale
          }
        ]
      }}
    >
      <Pressable
        onPress={onPress}
        onPressIn={
          handlePressIn
        }
        onPressOut={
          handlePressOut
        }
        accessibilityRole="button"
        accessibilityLabel={`${activity.title}. ${category}. Duración aproximada: ${formatDuration(
          activity.estimated_duration
        )}`}
        accessibilityHint="Abre los detalles de la actividad"
        style={({ pressed }) => [
          styles.activityCard,

          pressed &&
            styles.activityCardPressed
        ]}
      >
        <View
          style={
            styles.activityHeader
          }
        >
          <View
            style={styles.iconBox}
          >
            <Text
              style={
                styles.activityEmoji
              }
            >
              {getCategoryEmoji(
                activity.category
              )}
            </Text>
          </View>

          <View
            style={
              styles.activityTitleBox
            }
          >
            <Text
              style={
                styles.activityTitle
              }
            >
              {activity.title}
            </Text>

            <Text
              style={
                styles.activityCategory
              }
            >
              {category}
            </Text>
          </View>

          <Text
            style={
              styles.activityArrow
            }
          >
            ›
          </Text>
        </View>

        <Text
          style={
            styles.activityDescription
          }
        >
          {activity.description}
        </Text>

        <View
          style={
            styles.activityFooter
          }
        >
          <View
            style={
              styles.durationBadge
            }
          >
            <Text
              style={
                styles.durationText
              }
            >
              ⏱{" "}
              {formatDuration(
                activity.estimated_duration
              )}
            </Text>
          </View>

          <Text
            style={
              styles.viewText
            }
          >
            Ver actividad
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

export default function ActivitiesScreen() {
  const router = useRouter();

  const [
    activities,
    setActivities
  ] = useState<Activity[]>([]);

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

  const historyScale =
    useRef(
      new Animated.Value(1)
    ).current;

  const loadActivities =
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
          const result =
            await getActivities();

          setActivities(
            result.activities ??
              []
          );
        } catch (error) {
          setActivities([]);

          setErrorMessage(
            getApiErrorMessage(
              error,
              "No fue posible consultar las actividades"
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
    void loadActivities();
  }, [loadActivities]);

  function openActivity(
    activityId: number
  ) {
    router.push({
      pathname:
        "/(app)/activity-detail/[id]",

      params: {
        id: String(activityId)
      }
    });
  }

  function handleHistoryPressIn() {
    Animated.spring(
      historyScale,
      {
        toValue: 0.985,
        useNativeDriver: true,
        speed: 30,
        bounciness: 0
      }
    ).start();
  }

  function handleHistoryPressOut() {
    Animated.spring(
      historyScale,
      {
        toValue: 1,
        useNativeDriver: true,
        speed: 30,
        bounciness: 3
      }
    ).start();
  }

  return (
    <SafeAreaView
      style={styles.safeArea}
    >
      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
        showsVerticalScrollIndicator={
          false
        }
        refreshControl={
          <RefreshControl
            refreshing={
              isRefreshing
            }
            onRefresh={() => {
              void loadActivities(
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
            Actividades de autocuidado y autorreflexión
          </Text>

          <Text
            style={
              styles.subtitle
            }
          >
            Realiza ejercicios guiados
            para fortalecer la
            autorreflexión y el bienestar
            emocional.
          </Text>
        </View>

        <Animated.View
          style={{
            transform: [
              {
                scale:
                  historyScale
              }
            ]
          }}
        >
          <Pressable
            onPress={() => {
              router.push(
                "/(app)/completed-activities"
              );
            }}
            onPressIn={
              handleHistoryPressIn
            }
            onPressOut={
              handleHistoryPressOut
            }
            accessibilityRole="button"
            accessibilityLabel="Historial de actividades"
            accessibilityHint="Consulta tus respuestas y actividades completadas"
            style={({ pressed }) => [
              styles.historyButton,

              pressed &&
                styles.buttonPressed
            ]}
          >
            <View
              style={
                styles.historyContent
              }
            >
              <Text
                style={
                  styles.historyButtonTitle
                }
              >
                Historial de actividades
              </Text>

              <Text
                style={
                  styles.historyButtonText
                }
              >
                Consulta tus respuestas y
                actividades completadas.
              </Text>
            </View>

            <Text
              style={
                styles.historyArrow
              }
            >
              ›
            </Text>
          </Pressable>
        </Animated.View>

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
              Consultando actividades...
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
              No se pudo cargar el
              catálogo
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
                void loadActivities();
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
        !errorMessage &&
        activities.length === 0 ? (
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
              🌱
            </Text>

            <Text
              style={
                styles.emptyTitle
              }
            >
              No hay actividades
              disponibles
            </Text>

            <Text
              style={
                styles.emptyText
              }
            >
              En este momento no hay
              actividades de autocuidado
              y autorreflexión disponibles.
              Puedes volver a consultar
              más tarde.
            </Text>
          </View>
        ) : null}

        {!isLoading &&
        !errorMessage &&
        activities.length > 0 ? (
          <>
            <View
              style={
                styles.sectionHeader
              }
            >
              <View>
                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Ejercicios disponibles
                </Text>

                <Text
                  style={
                    styles.sectionSubtitle
                  }
                >
                  Selecciona una actividad
                  para comenzar
                </Text>
              </View>

              <View
                style={
                  styles.totalBadge
                }
                accessible
                accessibilityLabel={`${activities.length} ${
                  activities.length ===
                  1
                    ? "actividad disponible"
                    : "actividades disponibles"
                }`}
              >
                <Text
                  style={
                    styles.totalText
                  }
                >
                  {activities.length}
                </Text>
              </View>
            </View>

            {activities.map(
              (activity) => (
                <ActivityCard
                  key={
                    activity.id
                  }
                  activity={
                    activity
                  }
                  onPress={() => {
                    openActivity(
                      activity.id
                    );
                  }}
                />
              )
            )}
          </>
        ) : null}

        <View
          style={
            styles.noticeBox
          }
        >
          <Text
            style={
              styles.noticeTitle
            }
          >
            Información importante
          </Text>

          <Text
            style={
              styles.noticeText
            }
          >
            Estas actividades ofrecen
            apoyo y orientación general.
            No reemplazan la evaluación
            o atención de un profesional
            de salud mental.
          </Text>
        </View>
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

    historyButton: {
      minHeight: 88,
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      backgroundColor:
        "#526D82",
      borderRadius: 20,
      paddingHorizontal: 18,
      paddingVertical: 16,
      marginBottom: 24
    },

    historyContent: {
      flex: 1,
      paddingRight: 10
    },

    historyButtonTitle: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "800",
      marginBottom: 4
    },

    historyButtonText: {
      color: "#DCE7EC",
      fontSize: 12,
      lineHeight: 17
    },

    historyArrow: {
      color: "#FFFFFF",
      fontSize: 30,
      marginLeft: 10
    },

    buttonPressed: {
      opacity: 0.83
    },

    loadingBox: {
      alignItems:
        "center",
      paddingVertical: 55
    },

    loadingText: {
      color: "#718087",
      marginTop: 12,
      fontSize: 13
    },

    errorBox: {
      backgroundColor:
        "#FDECEC",
      borderRadius: 18,
      padding: 18,
      marginBottom: 20
    },

    errorTitle: {
      color: "#8E3030",
      fontSize: 16,
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
      marginTop: 15
    },

    retryText: {
      color: "#8E3030",
      fontSize: 13,
      fontWeight: "800"
    },

    emptyBox: {
      alignItems:
        "center",
      backgroundColor:
        "#FFFFFF",
      borderRadius: 20,
      padding: 30
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
      textAlign: "center",
      lineHeight: 19
    },

    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent:
        "space-between",
      marginBottom: 13
    },

    sectionTitle: {
      color: "#243642",
      fontSize: 19,
      fontWeight: "800"
    },

    sectionSubtitle: {
      color: "#718087",
      fontSize: 12,
      marginTop: 3
    },

    totalBadge: {
      minWidth: 29,
      height: 29,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "#DCE8EC",
      borderRadius: 15,
      marginLeft: 9
    },

    totalText: {
      color: "#526D82",
      fontWeight: "900",
      fontSize: 12
    },

    activityCard: {
      backgroundColor:
        "#FFFFFF",
      borderRadius: 20,
      padding: 17,
      marginBottom: 13,
      elevation: 2,
      shadowColor:
        "#000000",
      shadowOpacity: 0.05,
      shadowRadius: 8,
      shadowOffset: {
        width: 0,
        height: 3
      }
    },

    activityCardPressed: {
      opacity: 0.86
    },

    activityHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 13
    },

    iconBox: {
      width: 50,
      height: 50,
      alignItems:
        "center",
      justifyContent:
        "center",
      backgroundColor:
        "#E7EFF2",
      borderRadius: 16,
      marginRight: 12
    },

    activityEmoji: {
      fontSize: 25
    },

    activityTitleBox: {
      flex: 1
    },

    activityTitle: {
      color: "#243642",
      fontSize: 16,
      fontWeight: "800",
      marginBottom: 3
    },

    activityCategory: {
      color: "#718087",
      fontSize: 12
    },

    activityArrow: {
      color: "#7C919B",
      fontSize: 27,
      marginLeft: 8
    },

    activityDescription: {
      color: "#5E6E76",
      fontSize: 13,
      lineHeight: 20
    },

    activityFooter: {
      flexDirection: "row",
      alignItems:
        "center",
      justifyContent:
        "space-between",
      marginTop: 14
    },

    durationBadge: {
      backgroundColor:
        "#EDF3F5",
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 7
    },

    durationText: {
      color: "#526D82",
      fontSize: 12,
      fontWeight: "700"
    },

    viewText: {
      color: "#526D82",
      fontSize: 12,
      fontWeight: "800"
    },

    noticeBox: {
      backgroundColor:
        "#E6EEF1",
      borderRadius: 18,
      padding: 17,
      marginTop: 10
    },

    noticeTitle: {
      color: "#405A69",
      fontSize: 14,
      fontWeight: "800",
      marginBottom: 5
    },

    noticeText: {
      color: "#5F737E",
      fontSize: 12,
      lineHeight: 18
    }
  });