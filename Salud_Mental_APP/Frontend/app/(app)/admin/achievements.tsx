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
  AdminAchievement,
  AdminAchievementStatus,
  getAdminAchievements,
  updateAdminAchievementStatus
} from "../../../services/adminService";

function getCriterionName(
  criterionType: string
): string {
  switch (criterionType) {
    case "emotion_count":
      return "Cantidad de emociones";

    case "activity_count":
      return "Actividades completadas";

    case "level":
      return "Nivel alcanzado";

    case "streak_days":
      return "Días consecutivos";

    case "points":
      return "Puntos acumulados";

    default:
      return "Criterio personalizado";
  }
}

function getCriterionDescription(
  achievement: AdminAchievement
): string {
  const value =
    achievement.criterion_value;

  switch (
    achievement.criterion_type
  ) {
    case "emotion_count":
      return value === 1
        ? "Registrar 1 emoción"
        : `Registrar ${value} emociones`;

    case "activity_count":
      return value === 1
        ? "Completar 1 actividad diferente"
        : `Completar ${value} actividades diferentes`;

    case "level":
      return `Alcanzar el nivel ${value}`;

    case "streak_days":
      return value === 1
        ? "Mantener una racha de 1 día"
        : `Mantener una racha de ${value} días`;

    case "points":
      return `Acumular ${value} puntos`;

    default:
      return "Cumplir el criterio configurado";
  }
}

function getAchievementEmoji(
  criterionType: string
): string {
  switch (criterionType) {
    case "emotion_count":
      return "😊";

    case "activity_count":
      return "🌿";

    case "level":
      return "⭐";

    case "streak_days":
      return "🔥";

    case "points":
      return "💎";

    default:
      return "🏆";
  }
}

export default function AdminAchievementsScreen() {
  const router = useRouter();

  const [
    achievements,
    setAchievements
  ] =
    useState<AdminAchievement[]>(
      []
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
    pendingAchievementId,
    setPendingAchievementId
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

  const loadAchievements =
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
            await getAdminAchievements();

          setAchievements(
            result.achievements
          );
        } catch (error) {
          setAchievements([]);

          setErrorMessage(
            getApiErrorMessage(
              error,
              "No fue posible consultar los logros"
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
    void loadAchievements();
  }, [loadAchievements]);

  function openCreateForm() {
    router.push(
      "/(app)/admin/achievement-form"
    );
  }

  function openEditForm(
    achievementId: number
  ) {
    router.push({
      pathname:
        "/(app)/admin/achievement-form",

      params: {
        id: String(achievementId)
      }
    });
  }

  function replaceAchievement(
    updatedAchievement:
      AdminAchievement
  ) {
    setAchievements(
      (currentAchievements) =>
        currentAchievements.map(
          (achievement) =>
            achievement.id ===
            updatedAchievement.id
              ? updatedAchievement
              : achievement
        )
    );
  }

  function confirmStatusChange(
    achievement: AdminAchievement
  ) {
    const nextStatus:
      AdminAchievementStatus =
      achievement.status === "active"
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
      } logro`,

      `¿Deseas ${action} el logro "${achievement.title}"?`,

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
              achievement,
              nextStatus
            );
          }
        }
      ]
    );
  }

  async function handleStatusChange(
    achievement: AdminAchievement,
    nextStatus:
      AdminAchievementStatus
  ) {
    setPendingAchievementId(
      achievement.id
    );

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result =
        await updateAdminAchievementStatus(
          achievement.id,
          nextStatus
        );

      replaceAchievement(
        result.achievement
      );

      setSuccessMessage(
        result.message
      );
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(
          error,
          "No fue posible cambiar el estado del logro"
        )
      );
    } finally {
      setPendingAchievementId(null);
    }
  }

  const activeCount =
    achievements.filter(
      (achievement) =>
        achievement.status ===
        "active"
    ).length;

  const inactiveCount =
    achievements.length -
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
              void loadAchievements(
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
          accessibilityRole="button"
          accessibilityLabel="Volver"
          style={styles.backButton}
        >
          <Text style={styles.backText}>
            ‹ Volver
          </Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.title}>
            Gestión de logros
          </Text>

          <Text style={styles.subtitle}>
            Crea y configura los criterios
            que permiten desbloquear
            recompensas.
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
            style={styles.createIcon}
          >
            +
          </Text>

          <View
            style={styles.createContent}
          >
            <Text
              style={styles.createTitle}
            >
              Nuevo logro
            </Text>

            <Text
              style={styles.createText}
            >
              Define un criterio y su valor
              necesario.
            </Text>
          </View>

          <Text
            style={styles.createArrow}
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
                style={styles.summaryValue}
              >
                {achievements.length}
              </Text>

              <Text
                style={styles.summaryLabel}
              >
                total
              </Text>
            </View>

            <View
              style={styles.summaryCard}
            >
              <Text
                style={styles.summaryValue}
              >
                {activeCount}
              </Text>

              <Text
                style={styles.summaryLabel}
              >
                activos
              </Text>
            </View>

            <View
              style={styles.summaryCard}
            >
              <Text
                style={styles.summaryValue}
              >
                {inactiveCount}
              </Text>

              <Text
                style={styles.summaryLabel}
              >
                inactivos
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
              Consultando logros...
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
                void loadAchievements();
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
        achievements.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text
              style={styles.emptyEmoji}
            >
              🏆
            </Text>

            <Text
              style={styles.emptyTitle}
            >
              No existen logros
            </Text>

            <Text
              style={styles.emptyText}
            >
              Crea el primer logro del
              sistema.
            </Text>
          </View>
        ) : null}

        {!isLoading &&
        achievements.map(
          (achievement) => {
            const isPending =
              pendingAchievementId ===
              achievement.id;

            return (
              <View
                key={achievement.id}
                style={styles.achievementCard}
              >
                <View
                  style={
                    styles.achievementHeader
                  }
                >
                  <View
                    style={styles.iconBox}
                  >
                    <Text
                      style={
                        styles.achievementEmoji
                      }
                    >
                      {getAchievementEmoji(
                        achievement
                          .criterion_type
                      )}
                    </Text>
                  </View>

                  <View
                    style={styles.titleBox}
                  >
                    <Text
                      style={
                        styles.achievementTitle
                      }
                    >
                      {achievement.title}
                    </Text>

                    <Text
                      style={styles.codeText}
                    >
                      {achievement.code}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,

                      achievement.status ===
                      "active"
                        ? styles.activeBadge
                        : styles.inactiveBadge
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,

                        achievement.status ===
                        "active"
                          ? styles.activeText
                          : styles.inactiveText
                      ]}
                    >
                      {achievement.status ===
                      "active"
                        ? "ACTIVO"
                        : "INACTIVO"}
                    </Text>
                  </View>
                </View>

                <Text
                  style={
                    styles.achievementDescription
                  }
                >
                  {achievement.description}
                </Text>

                <View
                  style={styles.criterionBox}
                >
                  <Text
                    style={
                      styles.criterionLabel
                    }
                  >
                    {getCriterionName(
                      achievement
                        .criterion_type
                    )}
                  </Text>

                  <Text
                    style={
                      styles.criterionValue
                    }
                  >
                    {getCriterionDescription(
                      achievement
                    )}
                  </Text>
                </View>

                {achievement
                  .points_required > 0 ? (
                  <Text
                    style={
                      styles.pointsText
                    }
                  >
                    Puntos requeridos:{" "}
                    {
                      achievement
                        .points_required
                    }
                  </Text>
                ) : null}

                <View style={styles.divider} />

                {isPending ? (
                  <View
                    style={styles.pendingBox}
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
                      Actualizando logro...
                    </Text>
                  </View>
                ) : (
                  <View
                    style={styles.actionsRow}
                  >
                    <Pressable
                      onPress={() => {
                        openEditForm(
                          achievement.id
                        );
                      }}
                      style={[
                        styles.actionButton,
                        styles.editButton
                      ]}
                    >
                      <Text
                        style={
                          styles.editText
                        }
                      >
                        Editar
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        confirmStatusChange(
                          achievement
                        );
                      }}
                      style={[
                        styles.actionButton,

                        achievement.status ===
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

                          achievement.status ===
                          "active"
                            ? styles
                                .deactivateText
                            : styles
                                .activateText
                        ]}
                      >
                        {achievement.status ===
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

        <View style={styles.noticeBox}>
          <Text style={styles.noticeTitle}>
            Funcionamiento automático
          </Text>

          <Text style={styles.noticeText}>
            El administrador define los
           criterios y los logros se
           desbloquean automáticamente cuando
           el usuario cumple las condiciones.
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

  createButton: {
    minHeight: 90,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#526D82",
    borderRadius: 20,
    padding: 17,
    marginBottom: 18
  },

  createIcon: {
    width: 48,
    color: "#FFFFFF",
    fontSize: 36,
    fontWeight: "300",
    textAlign: "center",
    marginRight: 10
  },

  createContent: {
    flex: 1
  },

  createTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 4
  },

  createText: {
    color: "#DCE7EC",
    fontSize: 12,
    lineHeight: 17
  },

  createArrow: {
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

  achievementCard: {
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

  achievementHeader: {
    flexDirection: "row",
    alignItems: "center"
  },

  iconBox: {
    width: 49,
    height: 49,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E7EFF2",
    borderRadius: 16,
    marginRight: 12
  },

  achievementEmoji: {
    fontSize: 24
  },

  titleBox: {
    flex: 1,
    paddingRight: 8
  },

  achievementTitle: {
    color: "#243642",
    fontSize: 16,
    fontWeight: "800"
  },

  codeText: {
    color: "#7A888F",
    fontSize: 10,
    fontWeight: "700",
    marginTop: 4
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

  achievementDescription: {
    color: "#5E6E76",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 14
  },

  criterionBox: {
    backgroundColor: "#EDF3F5",
    borderRadius: 14,
    padding: 13,
    marginTop: 13
  },

  criterionLabel: {
    color: "#718087",
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 4
  },

  criterionValue: {
    color: "#405A69",
    fontSize: 13,
    fontWeight: "800"
  },

  pointsText: {
    color: "#7A6847",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 10
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

  editText: {
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