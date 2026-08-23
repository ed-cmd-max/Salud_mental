import React, {
  useEffect,
  useRef
} from "react";

import {
  Animated,
  StyleSheet,
  Text,
  View
} from "react-native";

interface AchievementNotificationProps {
  title: string | null;
  onHide: () => void;
}

export default function AchievementNotification({
  title,
  onHide
}: AchievementNotificationProps) {
  const translateY =
    useRef(
      new Animated.Value(-100)
    ).current;

  const opacity =
    useRef(
      new Animated.Value(0)
    ).current;

  useEffect(() => {
    if (!title) {
      return;
    }

    translateY.setValue(-100);
    opacity.setValue(0);

    Animated.parallel([
      Animated.spring(
        translateY,
        {
          toValue: 0,
          useNativeDriver: true,
          friction: 7,
          tension: 70
        }
      ),

      Animated.timing(
        opacity,
        {
          toValue: 1,
          duration: 250,
          useNativeDriver: true
        }
      )
    ]).start();

    const timer =
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(
            translateY,
            {
              toValue: -100,
              duration: 300,
              useNativeDriver: true
            }
          ),

          Animated.timing(
            opacity,
            {
              toValue: 0,
              duration: 250,
              useNativeDriver: true
            }
          )
        ]).start(() => {
          onHide();
        });
      }, 3500);

    return () => {
      clearTimeout(timer);
    };
  }, [
    title,
    opacity,
    translateY,
    onHide
  ]);

  if (!title) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[
        styles.container,
        {
          opacity,
          transform: [
            {
              translateY
            }
          ]
        }
      ]}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>
          🏆
        </Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>
          ¡LOGRO DESBLOQUEADO!
        </Text>

        <Text
          style={styles.title}
          numberOfLines={2}
        >
          {title}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles =
  StyleSheet.create({
    container: {
      position: "absolute",
      top: 12,
      left: 16,
      right: 16,

      zIndex: 1000,
      elevation: 15,

      minHeight: 76,

      flexDirection: "row",
      alignItems: "center",

      backgroundColor: "#526D82",

      borderRadius: 18,

      paddingHorizontal: 15,
      paddingVertical: 13,

      shadowColor: "#000000",
      shadowOffset: {
        width: 0,
        height: 5
      },
      shadowOpacity: 0.2,
      shadowRadius: 10
    },

    iconContainer: {
      width: 48,
      height: 48,

      alignItems: "center",
      justifyContent: "center",

      backgroundColor:
        "rgba(255,255,255,0.15)",

      borderRadius: 24,

      marginRight: 13
    },

    icon: {
      fontSize: 25
    },

    content: {
      flex: 1
    },

    label: {
      color: "#D9E5EA",
      fontSize: 11,
      fontWeight: "900",
      letterSpacing: 0.8,
      marginBottom: 3
    },

    title: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "800",
      lineHeight: 21
    }
  });