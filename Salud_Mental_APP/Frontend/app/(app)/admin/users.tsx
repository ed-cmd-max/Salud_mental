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
  useAuth
} from "../../../context/AuthContext";

import {
  getApiErrorMessage
} from "../../../services/api";

import {
  AccountStatus,
  AdminUser,
  UserRole,
  getAdminUsers,
  updateAdminUserRole,
  updateAdminUserStatus
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

export default function AdminUsersScreen() {
  const router = useRouter();

  const {
    user: authenticatedUser
  } = useAuth();

  const [
    users,
    setUsers
  ] = useState<AdminUser[]>([]);

  const [
    isLoading,
    setIsLoading
  ] = useState(true);

  const [
    isRefreshing,
    setIsRefreshing
  ] = useState(false);

  const [
    pendingUserId,
    setPendingUserId
  ] = useState<number | null>(null);

  const [
    errorMessage,
    setErrorMessage
  ] = useState<string | null>(null);

  const [
    successMessage,
    setSuccessMessage
  ] = useState<string | null>(null);

  const loadUsers = useCallback(
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
          await getAdminUsers();

        setUsers(result.users);
      } catch (error) {
        setUsers([]);

        setErrorMessage(
          getApiErrorMessage(
            error,
            "No fue posible consultar los usuarios"
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
    void loadUsers();
  }, [loadUsers]);

  function replaceUser(
    updatedUser: AdminUser
  ) {
    setUsers((currentUsers) =>
      currentUsers.map((user) =>
        user.id === updatedUser.id
          ? updatedUser
          : user
      )
    );
  }

  function confirmStatusChange(
    selectedUser: AdminUser
  ) {
    const nextStatus:
      AccountStatus =
      selectedUser.account_status ===
      "active"
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
      } cuenta`,
      `¿Deseas ${action} la cuenta de ${selectedUser.name}?`,
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
              selectedUser,
              nextStatus
            );
          }
        }
      ]
    );
  }

  async function handleStatusChange(
    selectedUser: AdminUser,
    nextStatus: AccountStatus
  ) {
    setPendingUserId(selectedUser.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result =
        await updateAdminUserStatus(
          selectedUser.id,
          nextStatus
        );

      replaceUser(result.user);
      setSuccessMessage(result.message);
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(
          error,
          "No fue posible cambiar el estado de la cuenta"
        )
      );
    } finally {
      setPendingUserId(null);
    }
  }

  function confirmRoleChange(
    selectedUser: AdminUser
  ) {
    const nextRole:
      UserRole =
      selectedUser.role === "admin"
        ? "user"
        : "admin";

    const message =
      nextRole === "admin"
        ? `¿Deseas asignar permisos administrativos a ${selectedUser.name}?`
        : `¿Deseas retirar los permisos administrativos de ${selectedUser.name}?`;

    Alert.alert(
      "Cambiar rol",
      message,
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text:
            nextRole === "admin"
              ? "Asignar admin"
              : "Cambiar a usuario",

          style:
            nextRole === "user"
              ? "destructive"
              : "default",

          onPress: () => {
            void handleRoleChange(
              selectedUser,
              nextRole
            );
          }
        }
      ]
    );
  }

  async function handleRoleChange(
    selectedUser: AdminUser,
    nextRole: UserRole
  ) {
    setPendingUserId(selectedUser.id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const result =
        await updateAdminUserRole(
          selectedUser.id,
          nextRole
        );

      replaceUser(result.user);
      setSuccessMessage(result.message);
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(
          error,
          "No fue posible cambiar el rol del usuario"
        )
      );
    } finally {
      setPendingUserId(null);
    }
  }

  const activeUsers =
    users.filter(
      (user) =>
        user.account_status === "active"
    ).length;

  const adminUsers =
    users.filter(
      (user) =>
        user.role === "admin"
    ).length;

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
              void loadUsers(true);
            }}
            colors={["#526D82"]}
            tintColor="#526D82"
          />
        }
      >
        <Pressable
          onPress={() => router.back()}
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
            Gestión de usuarios
          </Text>

          <Text style={styles.subtitle}>
            Consulta cuentas registradas y
            administra su estado y rol.
          </Text>
        </View>

        {!isLoading &&
        !errorMessage ? (
          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <Text
                style={styles.summaryValue}
              >
                {users.length}
              </Text>

              <Text
                style={styles.summaryLabel}
              >
                usuarios
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <Text
                style={styles.summaryValue}
              >
                {activeUsers}
              </Text>

              <Text
                style={styles.summaryLabel}
              >
                cuentas activas
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <Text
                style={styles.summaryValue}
              >
                {adminUsers}
              </Text>

              <Text
                style={styles.summaryLabel}
              >
                administradores
              </Text>
            </View>
          </View>
        ) : null}

        {successMessage ? (
          <View style={styles.successBox}>
            <Text style={styles.successText}>
              {successMessage}
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
              Consultando usuarios...
            </Text>
          </View>
        ) : null}

        {!isLoading &&
        errorMessage ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>
              {errorMessage}
            </Text>

            <Pressable
              onPress={() => {
                void loadUsers();
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
        users.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>
              👥
            </Text>

            <Text style={styles.emptyTitle}>
              No existen usuarios
            </Text>
          </View>
        ) : null}

        {!isLoading &&
        users.map((selectedUser) => {
          const isCurrentUser =
            selectedUser.id ===
            authenticatedUser?.id;

          const isPending =
            pendingUserId ===
            selectedUser.id;

          return (
            <View
              key={selectedUser.id}
              style={styles.userCard}
            >
              <View style={styles.userHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {selectedUser.name
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                </View>

                <View style={styles.userInfo}>
                  <View
                    style={styles.userTitleRow}
                  >
                    <Text
                      style={styles.userName}
                    >
                      {selectedUser.name}
                    </Text>

                    {isCurrentUser ? (
                      <View
                        style={
                          styles.currentBadge
                        }
                      >
                        <Text
                          style={
                            styles.currentText
                          }
                        >
                          Tú
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <Text
                    style={styles.userEmail}
                  >
                    {selectedUser.email}
                  </Text>

                  <Text
                    style={styles.userDate}
                  >
                    Registro:{" "}
                    {formatDate(
                      selectedUser.created_at
                    )}
                  </Text>
                </View>
              </View>

              <View style={styles.badgesRow}>
                <View
                  style={[
                    styles.badge,

                    selectedUser.role ===
                      "admin"
                      ? styles.adminBadge
                      : styles.userBadge
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,

                      selectedUser.role ===
                        "admin"
                        ? styles.adminBadgeText
                        : styles.userBadgeText
                    ]}
                  >
                    {selectedUser.role ===
                    "admin"
                      ? "ADMIN"
                      : "USUARIO"}
                  </Text>
                </View>

                <View
                  style={[
                    styles.badge,

                    selectedUser
                      .account_status ===
                    "active"
                      ? styles.activeBadge
                      : styles.inactiveBadge
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,

                      selectedUser
                        .account_status ===
                      "active"
                        ? styles.activeText
                        : styles.inactiveText
                    ]}
                  >
                    {selectedUser
                      .account_status ===
                    "active"
                      ? "ACTIVA"
                      : "INACTIVA"}
                  </Text>
                </View>
              </View>

              {isPending ? (
                <View
                  style={styles.pendingBox}
                >
                  <ActivityIndicator
                    size="small"
                    color="#526D82"
                  />

                  <Text
                    style={styles.pendingText}
                  >
                    Actualizando usuario...
                  </Text>
                </View>
              ) : (
                <View style={styles.actionsRow}>
                  <Pressable
                    onPress={() => {
                      confirmStatusChange(
                        selectedUser
                      );
                    }}
                    disabled={isCurrentUser}
                    style={[
                      styles.actionButton,

                      selectedUser
                        .account_status ===
                      "active"
                        ? styles.deactivateButton
                        : styles.activateButton,

                      isCurrentUser &&
                        styles.disabledButton
                    ]}
                  >
                    <Text
                      style={[
                        styles.actionText,

                        selectedUser
                          .account_status ===
                        "active"
                          ? styles.deactivateText
                          : styles.activateText
                      ]}
                    >
                      {selectedUser
                        .account_status ===
                      "active"
                        ? "Desactivar"
                        : "Activar"}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      confirmRoleChange(
                        selectedUser
                      );
                    }}
                    disabled={isCurrentUser}
                    style={[
                      styles.actionButton,
                      styles.roleButton,

                      isCurrentUser &&
                        styles.disabledButton
                    ]}
                  >
                    <Text
                      style={[
                        styles.actionText,
                        styles.roleButtonText
                      ]}
                    >
                      {selectedUser.role ===
                      "admin"
                        ? "Cambiar a usuario"
                        : "Asignar admin"}
                    </Text>
                  </Pressable>
                </View>
              )}

              {isCurrentUser ? (
                <Text
                  style={styles.selfNotice}
                >
                  No puedes desactivar tu propia
                  cuenta ni retirar tu propio
                  rol administrativo.
                </Text>
              ) : null}
            </View>
          );
        })}
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

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18
  },

  summaryCard: {
    width: "31.5%",
    minHeight: 90,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    padding: 10
  },

  summaryValue: {
    color: "#405F70",
    fontSize: 23,
    fontWeight: "900"
  },

  summaryLabel: {
    color: "#718087",
    fontSize: 9,
    textAlign: "center",
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
    padding: 30
  },

  emptyEmoji: {
    fontSize: 36
  },

  emptyTitle: {
    color: "#243642",
    fontSize: 17,
    fontWeight: "800",
    marginTop: 8
  },

  userCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 17,
    marginBottom: 13,
    elevation: 2,
    shadowColor: "#000000",
    shadowOpacity: 0.05,
    shadowRadius: 7,
    shadowOffset: {
      width: 0,
      height: 3
    }
  },

  userHeader: {
    flexDirection: "row",
    alignItems: "center"
  },

  avatar: {
    width: 51,
    height: 51,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E4EDF1",
    borderRadius: 17,
    marginRight: 13
  },

  avatarText: {
    color: "#405F70",
    fontSize: 21,
    fontWeight: "900"
  },

  userInfo: {
    flex: 1
  },

  userTitleRow: {
    flexDirection: "row",
    alignItems: "center"
  },

  userName: {
    flexShrink: 1,
    color: "#243642",
    fontSize: 16,
    fontWeight: "800"
  },

  currentBadge: {
    backgroundColor: "#E8DFCA",
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 4,
    marginLeft: 7
  },

  currentText: {
    color: "#745F36",
    fontSize: 8,
    fontWeight: "900"
  },

  userEmail: {
    color: "#60717A",
    fontSize: 12,
    marginTop: 3
  },

  userDate: {
    color: "#8A969C",
    fontSize: 10,
    marginTop: 4
  },

  badgesRow: {
    flexDirection: "row",
    marginTop: 15,
    marginBottom: 14
  },

  badge: {
    borderRadius: 11,
    paddingHorizontal: 9,
    paddingVertical: 6,
    marginRight: 7
  },

  badgeText: {
    fontSize: 9,
    fontWeight: "900"
  },

  adminBadge: {
    backgroundColor: "#E8DFCA"
  },

  adminBadgeText: {
    color: "#745F36"
  },

  userBadge: {
    backgroundColor: "#E4EDF1"
  },

  userBadgeText: {
    color: "#526D82"
  },

  activeBadge: {
    backgroundColor: "#E1F1E5"
  },

  activeText: {
    color: "#3C6C49"
  },

  inactiveBadge: {
    backgroundColor: "#F4E1E1"
  },

  inactiveText: {
    color: "#984747"
  },

  actionsRow: {
    flexDirection: "row"
  },

  actionButton: {
    flex: 1,
    minHeight: 45,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 13
  },

  deactivateButton: {
    borderWidth: 1,
    borderColor: "#A34A4A",
    marginRight: 8
  },

  activateButton: {
    borderWidth: 1,
    borderColor: "#3F7450",
    marginRight: 8
  },

  roleButton: {
    backgroundColor: "#526D82"
  },

  actionText: {
    fontSize: 11,
    fontWeight: "800"
  },

  deactivateText: {
    color: "#A34A4A"
  },

  activateText: {
    color: "#3F7450"
  },

  roleButtonText: {
    color: "#FFFFFF"
  },

  disabledButton: {
    opacity: 0.35
  },

  pendingBox: {
    minHeight: 45,
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

  selfNotice: {
    color: "#8A7750",
    fontSize: 10,
    lineHeight: 15,
    marginTop: 10,
    textAlign: "center"
  }
});