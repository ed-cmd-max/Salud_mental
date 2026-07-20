import React, {
  useState
} from "react";

import {
  ActivityIndicator,
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

interface ModuleCardProps {
  title: string;
  description: string;
  onPress?: () => void;
}

function ModuleCard({
  title,
  description,
  onPress
}: ModuleCardProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.moduleCard,

        pressed &&
          onPress &&
          styles.moduleCardPressed
      ]}
    >
      <View style={styles.moduleIndicator} />

      <View style={styles.moduleContent}>
        <Text style={styles.moduleTitle}>
          {title}
        </Text>

        <Text style={styles.moduleDescription}>
          {description}
        </Text>
      </View>

      {onPress ? (
        <Text style={styles.moduleArrow}>
          ›
        </Text>
      ) : null}
    </Pressable>
  );
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

  const [message, setMessage] =
    useState<string | null>(null);

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

      router.replace("/(auth)/login");
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.greeting}>
              Hola,
            </Text>

            <Text style={styles.userName}>
              {user?.name}
            </Text>
          </View>

          <View
            style={[
              styles.roleBadge,
              user?.role === "admin" &&
                styles.adminBadge
            ]}
          >
            <Text style={styles.roleText}>
              {user?.role === "admin"
                ? "ADMIN"
                : "USUARIO"}
            </Text>
          </View>
        </View>

        <View style={styles.accountCard}>
          <Text style={styles.accountLabel}>
            Sesión activa
          </Text>

          <Text style={styles.accountEmail}>
            {user?.email}
          </Text>

          <View style={styles.accountStatusRow}>
            <View style={styles.statusDot} />

            <Text style={styles.statusText}>
              Cuenta activa y protegida mediante
              JWT
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          Módulos de la aplicación
        </Text>

       <ModuleCard
           title="Registro emocional"
           description="Registra la emoción, intensidad, descripción y fecha."
           onPress={() => {
             router.push(
              "/(app)/emotion-register"
        );
    }}
/>
        <ModuleCard
            title="Historial emocional"
            description="Consulta registros, filtros y estadísticas personales."
            onPress={() => {
                router.push(
                "/(app)/emotion-history"
            );
        }}
        />

        <ModuleCard
          title="Actividades terapéuticas"
          description="Realiza ejercicios guiados y conserva tus respuestas."
          onPress={() => {
            router.push(
              "/(app)/activities"
            );
          }}
        />

        <ModuleCard
          title="Gamificación"
          description="Revisa puntos, nivel, racha y logros desbloqueados."
        />

        {user?.role === "admin" ? (
          <ModuleCard
            title="Administración"
            description="Gestiona usuarios, actividades terapéuticas y logros."
          />
        ) : null}

        {message ? (
          <View style={styles.messageBox}>
            <Text style={styles.messageText}>
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
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed &&
              styles.buttonPressed
          ]}
        >
          {isRefreshing ? (
            <ActivityIndicator
              color="#526D82"
            />
          ) : (
            <Text
              style={
                styles.secondaryButtonText
              }
            >
              Actualizar sesión
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => {
            void handleSignOut();
          }}
          disabled={
            isSigningOut ||
            isRefreshing
          }
          style={({ pressed }) => [
            styles.logoutButton,
            pressed &&
              styles.buttonPressed
          ]}
        >
          {isSigningOut ? (
            <ActivityIndicator
              color="#FFFFFF"
            />
          ) : (
            <Text style={styles.logoutText}>
              Cerrar sesión
            </Text>
          )}
        </Pressable>
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
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 40
  },

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
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

  roleBadge: {
    backgroundColor: "#DDE8EC",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7
  },

  adminBadge: {
    backgroundColor: "#E8DFCA"
  },

  roleText: {
    color: "#526D82",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1
  },

  accountCard: {
    backgroundColor: "#526D82",
    borderRadius: 22,
    padding: 21,
    marginBottom: 28
  },

  accountLabel: {
    color: "#DCE7EC",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6
  },

  accountEmail: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 14
  },

  accountStatusRow: {
    flexDirection: "row",
    alignItems: "center"
  },

  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#A8E6B0",
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
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 17,
    marginBottom: 12,
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 3
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },

    moduleCardPressed: {
    opacity: 0.82,
    transform: [
        {
        scale: 0.99
        }
    ]
    },

    moduleArrow: {
    alignSelf: "center",
    color: "#7C919B",
    fontSize: 28,
    fontWeight: "400",
    marginLeft: 8
    },

  moduleIndicator: {
    width: 5,
    borderRadius: 4,
    backgroundColor: "#7C9BA8",
    marginRight: 14
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
    backgroundColor: "#E4F0E8",
    borderRadius: 14,
    padding: 13,
    marginTop: 8,
    marginBottom: 12
  },

  messageText: {
    color: "#356445",
    fontSize: 13,
    textAlign: "center"
  },

  secondaryButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#526D82",
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
    justifyContent: "center",
    backgroundColor: "#526D82",
    borderRadius: 15,
    marginTop: 12
  },

  logoutText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800"
  },

  buttonPressed: {
    opacity: 0.82
  }
});