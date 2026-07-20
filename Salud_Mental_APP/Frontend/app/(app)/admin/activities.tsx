import React, {
  useCallback,
  useEffect,
  useState
} from "react";

import {
  ActivityIndicator,
  Alert,
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
} from "../../../services/api";

import {
  AdminActivity,
  AdminActivityStatus,
  getAdminActivities,
  updateAdminActivityStatus
} from "../../../services/adminService";

function formatDate(
  value: string
): string {
  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
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

export default function AdminActivitiesScreen() {
  const router = useRouter();

  const [
    activities,
    setActivities
  ] = useState<AdminActivity[]>([]);

  const [
    isLoading,
    setIsLoading
  ] = useState(true);

  const [
    isRefreshing,
    setIsRefreshing
  ] = useState(false);

  const [
    pendingActivityId,
    setPendingActivityId
  ] = useState<number | null>(
    null
  );

  const [
    errorMessage,
    setErrorMessage
  ] = useState<string | null>(
    null
  );

  const [
    successMessage,
    setSuccessMessage
  ] = useState<string | null>(
    null
  );

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
            await getAdminActivities();

          setActivities(
            result.activities
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

  function openCreateForm() {
    router.push(
      "/(app)/admin/activity-form"
    );
  }

  function openEditForm(
    activityId: number
  ) {
    router.push({
      pathname:
        "/(app)/admin/activity-form",

      params: {
        id: String(activityId)
      }
    });
  }

  function replaceActivity(
    updatedActivity: AdminActivity
  ) {
    setActivities(
      (currentActivities) =>
        currentActivities.map(
          (activity) =>
            activity.id ===
            updatedActivity.id
              ? updatedActivity
              : activity
        )
    );
  }

  function confirmStatusChange(
    activity: AdminActivity
  ) {
    const nextStatus:
      AdminActivityStatus =
      activity.status === "active"
        ? "inactive"
        : "active";

    const action =
      nextStatus === "active"
        ? "activar"
        : "desactivar";

    Alert.alert(
      `${
        action.charAt(0).toUpperCase() +
        action.slice(1)
      } actividad`,

      `¿Deseas ${action} la actividad "${activity.title}"?`,

      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text:
            nextStatus === "active"
              ? "Activar"
              : "Desactivar",

          style:
            nextStatus === "inactive"
              ? "destructive"
              : "default",

          onPress: () => {
            void handleStatusChange(
              activity,
              nextStatus
            );
          }
        }
      ]
    );
  }

  async function handleStatusChange(
    activity: AdminActivity,
    nextStatus: AdminActivityStatus
  ) {
    setPendingActivityId(
      activity.id
    );

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result =
        await updateAdminActivityStatus(
          activity.id,
          nextStatus
        );

      replaceActivity(
        result.activity
      );

      setSuccessMessage(
        result.message
      );
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(
          error,
          "No fue posible cambiar el estado de la actividad"
        )
      );
    } finally {
      setPendingActivityId(null);
    }
  }

  const activeCount =
    activities.filter(
      (activity) =>
        activity.status === "active"
    ).length;

  const inactiveCount =
    activities.length -
    activeCount;

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
            refreshing={isRefreshing}
            onRefresh={() => {
              void loadActivities(
                true
              );
            }}
            colors={["#526D82"]}
            tintColor="#526D82"
          />
        }
      >
        <Pressable
          onPress={() =>
            router.back()
          }
          style={styles.backButton}
        >
          <Text style={styles.backText}>
            ‹ Volver
          </Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.title}>
            Gestión de actividades
          </Text>

          <Text style={styles.subtitle}>
            Crea, edita y controla la
            disponibilidad de las
            actividades terapéuticas.
          </Text>
        </View>

        <Pressable
          onPress={openCreateForm}
          style={({ pressed }) => [
            styles.createButton,

            pressed &&
              styles.buttonPressed
          ]}
        >
          <Text
            style={
              styles.createButtonIcon
            }
          >
            +
          </Text>

          <View style={styles.createTextBox}>
            <Text
              style={
                styles.createButtonTitle
              }
            >
              Nueva actividad
            </Text>

            <Text
              style={
                styles.createButtonText
              }
            >
              Agrega un ejercicio al
              catálogo terapéutico.
            </Text>
          </View>

          <Text
            style={
              styles.createButtonArrow
            }
          >
            ›
          </Text>
        </Pressable>

        {!isLoading &&
        !errorMessage ? (
          <View style={styles.summaryRow}>
            <View
              style={styles.summaryCard}
            >
              <Text
                style={
                  styles.summaryValue
                }
              >
                {activities.length}
              </Text>

              <Text
                style={
                  styles.summaryLabel
                }
              >
                total
              </Text>
            </View>

            <View
              style={styles.summaryCard}
            >
              <Text
                style={
                  styles.summaryValue
                }
              >
                {activeCount}
              </Text>

              <Text
                style={
                  styles.summaryLabel
                }
              >
                activas
              </Text>
            </View>

            <View
              style={styles.summaryCard}
            >
              <Text
                style={
                  styles.summaryValue
                }
              >
                {inactiveCount}
              </Text>

              <Text
                style={
                  styles.summaryLabel
                }
              >
                inactivas
              </Text>
            </View>
          </View>
        ) : null}

        {successMessage ? (
          <View
            style={styles.successBox}
          >
            <Text
              style={styles.successText}
            >
              {successMessage}
            </Text>
          </View>
        ) : null}

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
              Consultando actividades...
            </Text>
          </View>
        ) : null}

        {!isLoading &&
        errorMessage ? (
          <View style={styles.errorBox}>
            <Text
              style={styles.errorText}
            >
              {errorMessage}
            </Text>

            <Pressable
              onPress={() => {
                void loadActivities();
              }}
              style={styles.retryButton}
            >
              <Text
                style={styles.retryText}
              >
                Intentar nuevamente
              </Text>
            </Pressable>
          </View>
        ) : null}

        {!isLoading &&
        !errorMessage &&
        activities.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text
              style={styles.emptyEmoji}
            >
              🌿
            </Text>

            <Text
              style={styles.emptyTitle}
            >
              No existen actividades
            </Text>

            <Text
              style={styles.emptyText}
            >
              Crea la primera actividad
              terapéutica del catálogo.
            </Text>
          </View>
        ) : null}

        {!isLoading &&
        activities.map(
          (activity) => {
            const isPending =
              pendingActivityId ===
              activity.id;

            return (
              <View
                key={activity.id}
                style={styles.activityCard}
              >
                <View
                  style={
                    styles.activityHeader
                  }
                >
                  <View
                    style={
                      styles.activityIcon
                    }
                  >
                    <Text
                      style={
                        styles.activityEmoji
                      }
                    >
                      🌿
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
                        "Sin categoría"}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,

                      activity.status ===
                      "active"
                        ? styles.activeBadge
                        : styles.inactiveBadge
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,

                        activity.status ===
                        "active"
                          ? styles.activeText
                          : styles.inactiveText
                      ]}
                    >
                      {activity.status ===
                      "active"
                        ? "ACTIVA"
                        : "INACTIVA"}
                    </Text>
                  </View>
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
                    styles.metadataRow
                  }
                >
                  <Text
                    style={
                      styles.metadataText
                    }
                  >
                    ⏱{" "}
                    {
                      activity
                        .estimated_duration
                    }{" "}
                    minutos
                  </Text>

                  <Text
                    style={
                      styles.metadataText
                    }
                  >
                    Creada:{" "}
                    {formatDate(
                      activity.created_at
                    )}
                  </Text>
                </View>

                <View
                  style={styles.divider}
                />

                {isPending ? (
                  <View
                    style={
                      styles.pendingBox
                    }
                  >
                    <ActivityIndicator
                      size="small"
                      color="#526D82"
                    />

                    <Text
                      style={
                        styles.pendingText
                      }
                    >
                      Actualizando
                      actividad...
                    </Text>
                  </View>
                ) : (
                  <View
                    style={
                      styles.actionsRow
                    }
                  >
                    <Pressable
                      onPress={() => {
                        openEditForm(
                          activity.id
                        );
                      }}
                      style={[
                        styles.actionButton,
                        styles.editButton
                      ]}
                    >
                      <Text
                        style={
                          styles.editButtonText
                        }
                      >
                        Editar
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        confirmStatusChange(
                          activity
                        );
                      }}
                      style={[
                        styles.actionButton,

                        activity.status ===
                        "active"
                          ? styles
                              .deactivateButton
                          : styles
                              .activateButton
                      ]}
                    >
                      <Text
                        style={[
                          styles.actionText,

                          activity.status ===
                          "active"
                            ? styles
                                .deactivateText
                            : styles
                                .activateText
                        ]}
                      >
                        {activity.status ===
                        "active"
                          ? "Desactivar"
                          : "Activar"}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            );
          }
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

  createButton: {
    minHeight: 90,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#526D82",
    borderRadius: 20,
    padding: 17,
    marginBottom: 18
  },

  createButtonIcon: {
    width: 48,
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "300",
    textAlign: "center",
    marginRight: 10
  },

  createTextBox: {
    flex: 1
  },

  createButtonTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4
  },

  createButtonText: {
    color: "#DCE7EC",
    fontSize: 12,
    lineHeight: 17
  },

  createButtonArrow: {
    color: "#FFFFFF",
    fontSize: 30,
    marginLeft: 8
  },

  buttonPressed: {
    opacity: 0.82
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 17
  },

  summaryCard: {
    width: "31.5%",
    minHeight: 82,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 17
  },

  summaryValue: {
    color: "#405F70",
    fontSize: 23,
    fontWeight: "900"
  },

  summaryLabel: {
    color: "#718087",
    fontSize: 10,
    marginTop: 3
  },

  successBox: {
    backgroundColor: "#E4F2E8",
    borderRadius: 14,
    padding: 13,
    marginBottom: 15
  },

  successText: {
    color: "#356445",
    fontSize: 13,
    textAlign: "center"
  },

  loadingBox: {
    alignItems: "center",
    paddingVertical: 55
  },

  loadingText: {
    color: "#718087",
    fontSize: 13,
    marginTop: 12
  },

  errorBox: {
    backgroundColor: "#FDECEC",
    borderRadius: 18,
    padding: 18
  },

  errorText: {
    color: "#A33232",
    fontSize: 13,
    lineHeight: 19
  },

  retryButton: {
    minHeight: 45,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#A33232",
    borderRadius: 13,
    marginTop: 14
  },

  retryText: {
    color: "#A33232",
    fontSize: 13,
    fontWeight: "800"
  },

  emptyBox: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 31
  },

  emptyEmoji: {
    fontSize: 38
  },

  emptyTitle: {
    color: "#243642",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 9
  },

  emptyText: {
    color: "#718087",
    fontSize: 13,
    marginTop: 5,
    textAlign: "center"
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

  activityHeader: {
    flexDirection: "row",
    alignItems: "center"
  },

  activityIcon: {
    width: 49,
    height: 49,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E7EFF2",
    borderRadius: 16,
    marginRight: 12
  },

  activityEmoji: {
    fontSize: 24
  },

  activityTitleBox: {
    flex: 1,
    paddingRight: 8
  },

  activityTitle: {
    color: "#243642",
    fontSize: 16,
    fontWeight: "800"
  },

  activityCategory: {
    color: "#718087",
    fontSize: 11,
    marginTop: 3
  },

  statusBadge: {
    borderRadius: 11,
    paddingHorizontal: 8,
    paddingVertical: 6
  },

  activeBadge: {
    backgroundColor: "#E1F1E5"
  },

  inactiveBadge: {
    backgroundColor: "#F4E1E1"
  },

  statusText: {
    fontSize: 8,
    fontWeight: "900"
  },

  activeText: {
    color: "#3C6C49"
  },

  inactiveText: {
    color: "#984747"
  },

  activityDescription: {
    color: "#5E6E76",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 14
  },

  metadataRow: {
    marginTop: 13
  },

  metadataText: {
    color: "#7A888F",
    fontSize: 10,
    marginTop: 3
  },

  divider: {
    height: 1,
    backgroundColor: "#E5ECEF",
    marginVertical: 14
  },

  actionsRow: {
    flexDirection: "row"
  },

  actionButton: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13
  },

  editButton: {
    backgroundColor: "#526D82",
    marginRight: 8
  },

  editButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800"
  },

  deactivateButton: {
    borderWidth: 1,
    borderColor: "#A34A4A"
  },

  activateButton: {
    borderWidth: 1,
    borderColor: "#3F7450"
  },

  actionText: {
    fontSize: 12,
    fontWeight: "800"
  },

  deactivateText: {
    color: "#A34A4A"
  },

  activateText: {
    color: "#3F7450"
  },

  pendingBox: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EDF3F5",
    borderRadius: 13
  },

  pendingText: {
    color: "#60717A",
    fontSize: 11,
    marginLeft: 9
  }
});