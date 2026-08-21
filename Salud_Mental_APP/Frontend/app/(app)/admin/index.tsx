import React, {
  useState
} from "react";

import {
  ActivityIndicator,
  Alert,
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
} from "../../../context/AuthContext";

interface AdminModuleProps {
  emoji: string;
  title: string;
  description: string;
  onPress: () => void;
  enabled?: boolean;
}

function AdminModule({
  emoji,
  title,
  description,
  onPress,
  enabled = true
}: AdminModuleProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!enabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{
        disabled: !enabled
      }}
      style={({ pressed }) => [
        styles.moduleCard,

        pressed &&
          enabled &&
          styles.moduleCardPressed,

        !enabled &&
          styles.moduleCardDisabled
      ]}
    >
      <View
        style={styles.moduleIcon}
      >
        <Text
          style={styles.moduleEmoji}
        >
          {emoji}
        </Text>
      </View>

      <View
        style={styles.moduleContent}
      >
        <Text
          style={styles.moduleTitle}
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

        {!enabled ? (
          <Text
            style={
              styles.comingSoon
            }
          >
            Próximamente
          </Text>
        ) : null}
      </View>

      {enabled ? (
        <Text
          style={styles.moduleArrow}
        >
          ›
        </Text>
      ) : null}
    </Pressable>
  );
}

export default function AdminDashboardScreen() {
  const router = useRouter();

  const {
    user,
    signOut
  } = useAuth();

  const [
    isSigningOut,
    setIsSigningOut
  ] = useState(false);

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
    if (isSigningOut) {
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
      >
        <Pressable
          onPress={
            confirmSignOut
          }
          disabled={
            isSigningOut
          }
          style={
            styles.backButton
          }
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Cerrar sesión"
        >
          {isSigningOut ? (
            <ActivityIndicator
              size="small"
              color="#526D82"
            />
          ) : (
            <Text
              style={
                styles.backText
              }
            >
              Cerrar sesión
            </Text>
          )}
        </Pressable>

        <View
          style={styles.header}
        >
          <Text
            style={
              styles.eyebrow
            }
          >
            PANEL ADMINISTRATIVO
          </Text>

          <Text
            style={styles.title}
          >
            Administración
          </Text>

          <Text
            style={styles.subtitle}
          >
            Gestiona usuarios, actividades
            de autocuidado y
            autorreflexión, y logros de la
            aplicación.
          </Text>
        </View>

        <View
          style={styles.adminCard}
        >
          <View
            style={
              styles.adminIcon
            }
          >
            <Text
              style={
                styles.adminEmoji
              }
            >
              🛡️
            </Text>
          </View>

          <View
            style={
              styles.adminInfo
            }
          >
            <Text
              style={
                styles.adminLabel
              }
            >
              Sesión administrativa
            </Text>

            <Text
              style={
                styles.adminName
              }
            >
              {user?.name}
            </Text>

            <Text
              style={
                styles.adminEmail
              }
            >
              {user?.email}
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
              ADMIN
            </Text>
          </View>
        </View>

        <Text
          style={
            styles.sectionTitle
          }
        >
          Módulos administrativos
        </Text>

        <AdminModule
          emoji="👥"
          title="Gestión de usuarios"
          description="Consulta usuarios, cambia roles y activa o desactiva cuentas."
          onPress={() => {
            router.push(
              "/(app)/admin/users"
            );
          }}
        />

        <AdminModule
          emoji="🌿"
          title="Gestión de actividades"
          description="Crea, edita, activa y desactiva actividades de autocuidado y autorreflexión."
          onPress={() => {
            router.push(
              "/(app)/admin/activities"
            );
          }}
        />

        <AdminModule
          emoji="🏆"
          title="Gestión de logros"
          description="Administra criterios, requisitos y disponibilidad de logros."
          onPress={() => {
            router.push(
              "/(app)/admin/achievements"
            );
          }}
        />

        <View
          style={
            styles.securityBox
          }
        >
          <Text
            style={
              styles.securityTitle
            }
          >
            Seguridad administrativa
          </Text>

          <Text
            style={
              styles.securityText
            }
          >
            Las operaciones administrativas
            están protegidas y solo pueden ser
            realizadas por usuarios con los
            permisos correspondientes.
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
      minHeight: 44,
      alignSelf: "flex-start",
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

    eyebrow: {
      color: "#7A6847",
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 1.3,
      marginBottom: 7
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

    adminCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor:
        "#526D82",
      borderRadius: 22,
      padding: 18,
      marginBottom: 26
    },

    adminIcon: {
      width: 53,
      height: 53,
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor:
        "#FFFFFF",
      borderRadius: 17,
      marginRight: 13
    },

    adminEmoji: {
      fontSize: 26
    },

    adminInfo: {
      flex: 1
    },

    adminLabel: {
      color: "#DDE8EC",
      fontSize: 12,
      fontWeight: "700",
      marginBottom: 3
    },

    adminName: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "800"
    },

    adminEmail: {
      color: "#DCE7EC",
      fontSize: 12,
      marginTop: 3
    },

    roleBadge: {
      backgroundColor:
        "#E8DFCA",
      borderRadius: 14,
      paddingHorizontal: 10,
      paddingVertical: 7,
      marginLeft: 8
    },

    roleText: {
      color: "#745F36",
      fontSize: 12,
      fontWeight: "900",
      letterSpacing: 1
    },

    sectionTitle: {
      color: "#243642",
      fontSize: 19,
      fontWeight: "800",
      marginBottom: 13
    },

    moduleCard: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor:
        "#FFFFFF",
      borderRadius: 19,
      padding: 16,
      marginBottom: 12,
      elevation: 2,
      shadowColor:
        "#000000",
      shadowOpacity: 0.05,
      shadowRadius: 7,
      shadowOffset: {
        width: 0,
        height: 3
      }
    },

    moduleCardPressed: {
      opacity: 0.82,
      transform: [
        {
          scale: 0.99
        }
      ]
    },

    moduleCardDisabled: {
      opacity: 0.58
    },

    moduleIcon: {
      width: 51,
      height: 51,
      alignItems: "center",
      justifyContent:
        "center",
      backgroundColor:
        "#E7EFF2",
      borderRadius: 16,
      marginRight: 13
    },

    moduleEmoji: {
      fontSize: 25
    },

    moduleContent: {
      flex: 1
    },

    moduleTitle: {
      color: "#243642",
      fontSize: 16,
      fontWeight: "800",
      marginBottom: 4
    },

    moduleDescription: {
      color: "#68777F",
      fontSize: 12,
      lineHeight: 18
    },

    moduleArrow: {
      color: "#7C919B",
      fontSize: 28,
      marginLeft: 8
    },

    comingSoon: {
      color: "#8A7750",
      fontSize: 12,
      fontWeight: "800",
      marginTop: 6
    },

    securityBox: {
      backgroundColor:
        "#E6EEF1",
      borderRadius: 18,
      padding: 17,
      marginTop: 12
    },

    securityTitle: {
      color: "#405A69",
      fontSize: 14,
      fontWeight: "800",
      marginBottom: 5
    },

    securityText: {
      color: "#5F737E",
      fontSize: 12,
      lineHeight: 18
    }
  });