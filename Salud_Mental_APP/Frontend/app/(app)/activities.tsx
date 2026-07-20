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
  ] = useState<string | null>(null);

  const loadActivities = useCallback(
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
          result.activities ?? []
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
              void loadActivities(true);
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
            Actividades terapéuticas
          </Text>

          <Text style={styles.subtitle}>
            Realiza ejercicios guiados para
            fortalecer la autorreflexión y el
            bienestar emocional.
          </Text>
        </View>

        <Pressable
          onPress={() => {
            router.push(
              "/(app)/completed-activities"
            );
          }}
          style={({ pressed }) => [
            styles.historyButton,
            pressed &&
              styles.buttonPressed
          ]}
        >
          <View>
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

          <Text style={styles.historyArrow}>
            ›
          </Text>
        </Pressable>

        {isLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator
              size="large"
              color="#526D82"
            />

            <Text style={styles.loadingText}>
              Consultando actividades...
            </Text>
          </View>
        ) : null}

        {!isLoading && errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>
              No se pudo cargar el catálogo
            </Text>

            <Text style={styles.errorText}>
              {errorMessage}
            </Text>

            <Pressable
              onPress={() => {
                void loadActivities();
              }}
              style={styles.retryButton}
            >
              <Text style={styles.retryText}>
                Intentar nuevamente
              </Text>
            </Pressable>
          </View>
        ) : null}

        {!isLoading &&
        !errorMessage &&
        activities.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>
              🌱
            </Text>

            <Text style={styles.emptyTitle}>
              No hay actividades disponibles
            </Text>

            <Text style={styles.emptyText}>
              El catálogo no posee actividades
              activas en este momento.
            </Text>
          </View>
        ) : null}

        {!isLoading &&
        activities.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Ejercicios disponibles
              </Text>

              <View style={styles.totalBadge}>
                <Text style={styles.totalText}>
                  {activities.length}
                </Text>
              </View>
            </View>

            {activities.map((activity) => (
              <Pressable
                key={activity.id}
                onPress={() => {
                  openActivity(activity.id);
                }}
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
                      {activity.category ||
                        "Actividad terapéutica"}
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
                    style={styles.durationBadge}
                  >
                    <Text
                      style={
                        styles.durationText
                      }
                    >
                      ⏱{" "}
                      {
                        activity.estimated_duration
                      }{" "}
                      minutos
                    </Text>
                  </View>

                  <Text style={styles.viewText}>
                    Ver actividad
                  </Text>
                </View>
              </Pressable>
            ))}
          </>
        ) : null}

        <View style={styles.noticeBox}>
          <Text style={styles.noticeTitle}>
            Información importante
          </Text>

          <Text style={styles.noticeText}>
            Estas actividades ofrecen apoyo y
            orientación general. No reemplazan
            la evaluación o atención de un
            profesional de salud mental.
          </Text>
        </View>
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

  historyButton: {
    minHeight: 88,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#526D82",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 16,
    marginBottom: 24
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
    lineHeight: 17,
    maxWidth: 270
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
    alignItems: "center",
    paddingVertical: 55
  },

  loadingText: {
    color: "#718087",
    marginTop: 12,
    fontSize: 13
  },

  errorBox: {
    backgroundColor: "#FDECEC",
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
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#A14848",
    borderRadius: 13,
    marginTop: 15
  },

  retryText: {
    color: "#8E3030",
    fontSize: 13,
    fontWeight: "800"
  },

  emptyBox: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
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
    marginBottom: 6
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
    marginBottom: 13
  },

  sectionTitle: {
    color: "#243642",
    fontSize: 19,
    fontWeight: "800"
  },

  totalBadge: {
    minWidth: 29,
    height: 29,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DCE8EC",
    borderRadius: 15,
    marginLeft: 9
  },

  totalText: {
    color: "#526D82",
    fontWeight: "900",
    fontSize: 12
  },

  activityCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 17,
    marginBottom: 13,
    elevation: 2,
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3
    }
  },

  activityCardPressed: {
    opacity: 0.82,
    transform: [
      {
        scale: 0.99
      }
    ]
  },

  activityHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 13
  },

  iconBox: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E7EFF2",
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
    fontSize: 11
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
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 14
  },

  durationBadge: {
    backgroundColor: "#EDF3F5",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7
  },

  durationText: {
    color: "#526D82",
    fontSize: 11,
    fontWeight: "700"
  },

  viewText: {
    color: "#526D82",
    fontSize: 12,
    fontWeight: "800"
  },

  noticeBox: {
    backgroundColor: "#E6EEF1",
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