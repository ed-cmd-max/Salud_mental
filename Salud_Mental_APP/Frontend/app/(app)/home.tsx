import {
  Ionicons
} from "@expo/vector-icons";

import React, {
  useRef,
  useState
} from "react";

import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
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
} from "../../context/AuthContext";

import {
  getApiErrorMessage
} from "../../services/api";

type IconName =
  | "happy-outline"
  | "stats-chart-outline"
  | "leaf-outline"
  | "trophy-outline";

interface ModuleCardProps {
  icon: IconName;
  title: string;
  description: string;
  onPress: () => void;
}

function ModuleCard({
  icon,
  title,
  description,
  onPress
}: ModuleCardProps) {
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
        bounciness: 4
      }
    ).start();
  }

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
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        accessibilityRole="button"
        accessibilityLabel={title}
        style={({ pressed }) => [
          styles.moduleCard,
          pressed &&
            styles.moduleCardPressed
        ]}
      >
        <View
          style={
            styles.moduleIndicator
          }
        />

        <View
          style={
            styles.moduleIconBox
          }
        >
          <Ionicons
            name={icon}
            size={22}
            color="#526D82"
          />
        </View>

        <View
          style={
            styles.moduleContent
          }
        >
          <Text
            style={
              styles.moduleTitle
            }
          >
            {title}
          </Text>

          <Text
            style={
              styles.moduleDescription
            }
          >
            {description}
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={21}
          color="#7C919B"
        />
      </Pressable>
    </Animated.View>
  );
}

function getGreeting(): string {
  const hour =
    new Date().getHours();

  if (hour < 12) {
    return "Buenos días";
  }

  if (hour < 19) {
    return "Buenas tardes";
  }

  return "Buenas noches";
}

export default function HomeScreen() {
  const router = useRouter();

  const {
    user,
    signOut,
    refreshSession
  } = useAuth();

  const [
    isRefreshing,
    setIsRefreshing
  ] = useState(false);

  const [
    isSigningOut,
    setIsSigningOut
  ] = useState(false);

  const [
    message,
    setMessage
  ] =
    useState<string | null>(
      null
    );

  const greeting =
    getGreeting();

  async function handleRefresh() {
    setMessage(null);
    setIsRefreshing(true);

    try {
      await refreshSession();

      setMessage(
        "La sesión se actualizó correctamente"
      );
    } catch (error) {
      setMessage(
        getApiErrorMessage(
          error,
          "No se pudo actualizar la sesión"
        )
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleSignOut() {
    setIsSigningOut(true);

    try {
      await signOut();

      router.replace(
        "/(auth)/login"
      );
    } finally {
      setIsSigningOut(false);
    }
  }

  function confirmSignOut() {
    if (
      isSigningOut ||
      isRefreshing
    ) {
      return;
    }

    Alert.alert(
      "¿Deseas cerrar sesión?",
      "Tendrás que iniciar sesión nuevamente para continuar.",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Cerrar sesión",
          style: "destructive",
          onPress: () => {
            void handleSignOut();
          }
        }
      ]
    );
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
      >
        <View
          style={styles.header}
        >
          <View
            style={
              styles.headerText
            }
          >
            <Text
              style={
                styles.greeting
              }
            >
              {greeting},
            </Text>

            <Text
              style={
                styles.userName
              }
            >
              {user?.name} 👋
            </Text>

            <Text
              style={
                styles.greetingQuestion
              }
            >
              ¿Cómo te sientes hoy?
            </Text>
          </View>

          <View
            style={
              styles.roleBadge
            }
          >
            <Text
              style={
                styles.roleText
              }
            >
              USUARIO
            </Text>
          </View>
        </View>

        <View
          style={
            styles.accountCard
          }
        >
          <View
            style={
              styles.accountTopRow
            }
          >
            <View
              style={
                styles.accountIcon
              }
            >
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color="#526D82"
              />
            </View>

            <View
              style={
                styles.accountContent
              }
            >
              <Text
                style={
                  styles.accountLabel
                }
              >
                Sesión activa
              </Text>

              <Text
                style={
                  styles.accountEmail
                }
              >
                {user?.email}
              </Text>
            </View>
          </View>

          <View
            style={
              styles.accountStatusRow
            }
          >
            <View
              style={
                styles.statusDot
              }
            />

            <Text
              style={
                styles.statusText
              }
            >
              Tu sesión está activa y protegida
            </Text>
          </View>
        </View>

        <Text
          style={
            styles.sectionTitle
          }
        >
          Módulos de la aplicación
        </Text>

        <ModuleCard
          icon="happy-outline"
          title="Registro emocional"
          description="Registra cómo te sientes y la intensidad de tu emoción."
          onPress={() => {
            router.push(
              "/(app)/emotion-register"
            );
          }}
        />

        <ModuleCard
          icon="stats-chart-outline"
          title="Historial emocional"
          description="Consulta tus registros e identifica patrones emocionales."
          onPress={() => {
            router.push(
              "/(app)/emotion-history"
            );
          }}
        />

        <ModuleCard
          icon="leaf-outline"
          title="Actividades de autocuidado y autorreflexión"
          description="Realiza actividades guiadas y conserva tus reflexiones."
          onPress={() => {
            router.push(
              "/(app)/activities"
            );
          }}
        />

        <ModuleCard
          icon="trophy-outline"
          title="Mi progreso"
          description="Revisa tus puntos, nivel, racha y logros obtenidos."
          onPress={() => {
            router.push(
              "/(app)/gamification"
            );
          }}
        />

        {message ? (
          <View
            style={
              styles.messageBox
            }
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={20}
              color="#356445"
            />

            <Text
              style={
                styles.messageText
              }
            >
              {message}
            </Text>
          </View>
        ) : null}

        <Pressable
          onPress={() => {
            void handleRefresh();
          }}
          disabled={
            isRefreshing ||
            isSigningOut
          }
          accessibilityRole="button"
          accessibilityLabel="Actualizar sesión"
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed &&
              styles.buttonPressed,
            (
              isRefreshing ||
              isSigningOut
            ) &&
              styles.disabledButton
          ]}
        >
          {isRefreshing ? (
            <View
              style={
                styles.buttonContent
              }
            >
              <ActivityIndicator
                size="small"
                color="#526D82"
              />

              <Text
                style={
                  styles.secondaryButtonText
                }
              >
                Actualizando...
              </Text>
            </View>
          ) : (
            <View
              style={
                styles.buttonContent
              }
            >
              <Ionicons
                name="refresh-outline"
                size={19}
                color="#526D82"
              />

              <Text
                style={
                  styles.secondaryButtonText
                }
              >
                Actualizar sesión
              </Text>
            </View>
          )}
        </Pressable>

        <Pressable
          onPress={
            confirmSignOut
          }
          disabled={
            isSigningOut ||
            isRefreshing
          }
          accessibilityRole="button"
          accessibilityLabel="Cerrar sesión"
          style={({ pressed }) => [
            styles.logoutButton,
            pressed &&
              styles.buttonPressed,
            (
              isSigningOut ||
              isRefreshing
            ) &&
              styles.disabledButton
          ]}
        >
          {isSigningOut ? (
            <View
              style={
                styles.buttonContent
              }
            >
              <ActivityIndicator
                size="small"
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.logoutText
                }
              >
                Cerrando sesión...
              </Text>
            </View>
          ) : (
            <View
              style={
                styles.buttonContent
              }
            >
              <Ionicons
                name="log-out-outline"
                size={19}
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.logoutText
                }
              >
                Cerrar sesión
              </Text>
            </View>
          )}
        </Pressable>
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
      paddingHorizontal: 22,
      paddingTop: 28,
      paddingBottom: 40
    },

    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent:
        "space-between",
      marginBottom: 22
    },

    headerText: {
      flex: 1,
      paddingRight: 12
    },

    greeting: {
      color: "#65747C",
      fontSize: 15,
      marginBottom: 2
    },

    userName: {
      color: "#243642",
      fontSize: 28,
      fontWeight: "800"
    },

    greetingQuestion: {
      color: "#718087",
      fontSize: 13,
      marginTop: 5
    },

    roleBadge: {
      backgroundColor:
        "#DDE8EC",
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 7
    },

    roleText: {
      color: "#526D82",
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 1
    },

    accountCard: {
      backgroundColor:
        "#526D82",
      borderRadius: 22,
      padding: 21,
      marginBottom: 28
    },

    accountTopRow: {
      flexDirection: "row",
      alignItems: "center"
    },

    accountIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      backgroundColor:
        "#FFFFFF",
      alignItems: "center",
      justifyContent:
        "center",
      marginRight: 12
    },

    accountContent: {
      flex: 1
    },

    accountLabel: {
      color: "#DCE7EC",
      fontSize: 13,
      fontWeight: "700",
      marginBottom: 4
    },

    accountEmail: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "700"
    },

    accountStatusRow: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 14
    },

    statusDot: {
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor:
        "#A8E6B0",
      marginRight: 8
    },

    statusText: {
      flex: 1,
      color: "#EAF2F5",
      fontSize: 12,
      lineHeight: 17
    },

    sectionTitle: {
      color: "#243642",
      fontSize: 19,
      fontWeight: "800",
      marginBottom: 14
    },

    moduleCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor:
        "#FFFFFF",
      borderRadius: 18,
      padding: 16,
      marginBottom: 12,
      shadowColor:
        "#000000",
      shadowOffset: {
        width: 0,
        height: 3
      },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2
    },

    moduleCardPressed: {
      opacity: 0.88
    },

    moduleIndicator: {
      width: 4,
      alignSelf: "stretch",
      borderRadius: 4,
      backgroundColor:
        "#7C9BA8",
      marginRight: 12
    },

    moduleIconBox: {
      width: 42,
      height: 42,
      alignItems: "center",
      justifyContent:
        "center",
      borderRadius: 13,
      backgroundColor:
        "#EAF0F2",
      marginRight: 12
    },

    moduleContent: {
      flex: 1
    },

    moduleTitle: {
      color: "#243642",
      fontSize: 16,
      fontWeight: "800",
      marginBottom: 5
    },

    moduleDescription: {
      color: "#68777F",
      fontSize: 13,
      lineHeight: 19
    },

    messageBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor:
        "#E4F0E8",
      borderRadius: 14,
      padding: 13,
      marginTop: 8,
      marginBottom: 12
    },

    messageText: {
      flex: 1,
      color: "#356445",
      fontSize: 13
    },

    secondaryButton: {
      minHeight: 52,
      alignItems: "center",
      justifyContent:
        "center",
      borderWidth: 1,
      borderColor:
        "#526D82",
      borderRadius: 15,
      marginTop: 14
    },

    secondaryButtonText: {
      color: "#526D82",
      fontSize: 15,
      fontWeight: "800"
    },

    logoutButton: {
      minHeight: 52,
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor:
        "#526D82",
      borderRadius: 15,
      marginTop: 12
    },

    logoutText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "800"
    },

    buttonContent: {
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
    }
  });