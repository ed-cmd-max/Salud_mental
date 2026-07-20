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
  CompletedActivityRecord,
  getCompletedActivities
} from "../../services/activityService";

function formatDateTime(
  value: string
): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(
    "es-EC",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }
  );
}

export default function CompletedActivitiesScreen() {
  const router = useRouter();

  const [
    records,
    setRecords
  ] =
    useState<CompletedActivityRecord[]>(
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
    errorMessage,
    setErrorMessage
  ] = useState<string | null>(null);

  const loadHistory = useCallback(
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
          await getCompletedActivities();

        setRecords(
          result.activity_responses ??
            []
        );
      } catch (error) {
        setRecords([]);

        setErrorMessage(
          getApiErrorMessage(
            error,
            "No fue posible consultar las actividades completadas"
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
    void loadHistory();
  }, [loadHistory]);

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
              void loadHistory(true);
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
            Actividades completadas
          </Text>

          <Text style={styles.subtitle}>
            Consulta las respuestas y
            reflexiones que has guardado.
          </Text>
        </View>

        {!isLoading &&
        !errorMessage ? (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryValue}>
              {records.length}
            </Text>

            <Text style={styles.summaryLabel}>
              respuestas registradas
            </Text>
          </View>
        ) : null}

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
        ) : null}

        {!isLoading && errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              {errorMessage}
            </Text>

            <Pressable
              onPress={() => {
                void loadHistory();
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
        records.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>
              📘
            </Text>

            <Text style={styles.emptyTitle}>
              Aún no tienes actividades
            </Text>

            <Text style={styles.emptyText}>
              Completa un ejercicio para que
              aparezca en este historial.
            </Text>
          </View>
        ) : null}

        {!isLoading &&
        records.map((record) => (
          <View
            key={record.id}
            style={styles.recordCard}
          >
            <View style={styles.recordHeader}>
              <View style={styles.titleBox}>
                <Text
                  style={styles.recordTitle}
                >
                  {record.title}
                </Text>

                <Text
                  style={
                    styles.recordCategory
                  }
                >
                  {record.category ||
                    "Actividad terapéutica"}
                </Text>
              </View>

              <View
                style={[
                  styles.rewardBadge,

                  !record.points_awarded &&
                    styles.repeatBadge
                ]}
              >
                <Text
                  style={[
                    styles.rewardText,

                    !record.points_awarded &&
                      styles.repeatText
                  ]}
                >
                  {record.points_awarded
                    ? "Recompensada"
                    : "Repetición"}
                </Text>
              </View>
            </View>

            <Text style={styles.dateText}>
              {formatDateTime(
                record.completed_at
              )}
            </Text>

            <View style={styles.divider} />

            <Text style={styles.fieldLabel}>
              Respuesta
            </Text>

            <Text style={styles.fieldText}>
              {record.response}
            </Text>

            <Text style={styles.fieldLabel}>
              Observación
            </Text>

            <Text
              style={
                record.observation
                  ? styles.fieldText
                  : styles.emptyObservation
              }
            >
              {record.observation ||
                "Sin observación adicional."}
            </Text>

            <View style={styles.footer}>
              <Text style={styles.duration}>
                ⏱{" "}
                {
                  record.estimated_duration
                }{" "}
                minutos
              </Text>

              <Text
                style={[
                  styles.catalogStatus,

                  record.activity_catalog_status ===
                    "inactive" &&
                    styles.inactiveStatus
                ]}
              >
                {record.activity_catalog_status ===
                "active"
                  ? "Disponible"
                  : "Inactiva"}
              </Text>
            </View>
          </View>
        ))}
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

  summaryCard: {
    minHeight: 100,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#526D82",
    borderRadius: 20,
    marginBottom: 20
  },

  summaryValue: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "900"
  },

  summaryLabel: {
    color: "#DDE8EC",
    fontSize: 12,
    marginTop: 3
  },

  loadingBox: {
    alignItems: "center",
    paddingVertical: 60
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
    marginBottom: 6
  },

  emptyText: {
    color: "#718087",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center"
  },

  recordCard: {
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

  recordHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between"
  },

  titleBox: {
    flex: 1,
    paddingRight: 10
  },

  recordTitle: {
    color: "#243642",
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 3
  },

  recordCategory: {
    color: "#718087",
    fontSize: 11
  },

  rewardBadge: {
    backgroundColor: "#E1F1E5",
    borderRadius: 12,
    paddingHorizontal: 9,
    paddingVertical: 6
  },

  repeatBadge: {
    backgroundColor: "#EDF1F3"
  },

  rewardText: {
    color: "#3C6C49",
    fontSize: 9,
    fontWeight: "900"
  },

  repeatText: {
    color: "#68777F"
  },

  dateText: {
    color: "#87939A",
    fontSize: 11,
    marginTop: 10
  },

  divider: {
    height: 1,
    backgroundColor: "#E5ECEF",
    marginVertical: 14
  },

  fieldLabel: {
    color: "#40515A",
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 5
  },

  fieldText: {
    color: "#5E6E76",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 14
  },

  emptyObservation: {
    color: "#919BA0",
    fontSize: 13,
    fontStyle: "italic",
    marginBottom: 14
  },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2
  },

  duration: {
    color: "#60717A",
    fontSize: 11,
    fontWeight: "700"
  },

  catalogStatus: {
    color: "#3C6C49",
    fontSize: 10,
    fontWeight: "800"
  },

  inactiveStatus: {
    color: "#9A5757"
  }
});