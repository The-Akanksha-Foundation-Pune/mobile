import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { darkPalette, palette } from "../theme/theme";

type LoginScreenProps = {
  isLoading: boolean;
  canStartLogin: boolean;
  loginError?: string;
  onLoginPress: () => void;
};

const CREATIVE_SPARKS = [
  "Every frame can move a classroom.",
  "Your lens turns moments into momentum.",
  "Capture bold. Share what inspires change.",
];

export function LoginScreen({ isLoading, canStartLogin, loginError, onLoginPress }: LoginScreenProps) {
  const isDark = useColorScheme() === "dark";
  const { height } = useWindowDimensions();
  const isCompact = height < 740;
  const styles = useMemo(() => getStyles(isDark, isCompact), [isDark, isCompact]);
  const colors = isDark ? darkPalette : palette;
  const disabled = isLoading || !canStartLogin;
  const sparkLine = CREATIVE_SPARKS[new Date().getDate() % CREATIVE_SPARKS.length];
  const logoScale = useRef(new Animated.Value(0.88)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoFloat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const useNativeDriver = Platform.OS !== "web";

    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 7,
        tension: 70,
        useNativeDriver,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 650,
        useNativeDriver,
      }),
    ]).start();

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(logoFloat, {
          toValue: 1,
          duration: 1800,
          useNativeDriver,
        }),
        Animated.timing(logoFloat, {
          toValue: 0,
          duration: 1800,
          useNativeDriver,
        }),
      ])
    );
    floatLoop.start();
    return () => floatLoop.stop();
  }, [logoFloat, logoOpacity, logoScale]);

  const logoTranslateY = logoFloat.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -6],
  });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.hero}>
          <Text style={styles.eyebrow}>CaptureAkanksha</Text>
          <Text style={styles.headline}>Create.{"\n"}Capture.{"\n"}Inspire.</Text>
          <Text style={styles.tagline}>
            A creative space for Akanksha teams to turn real events into stories that spark action.
          </Text>
        </View>

        <View style={styles.inspirationCard}>
          <Ionicons name="color-palette-outline" size={18} color={colors.accent} />
          <Text style={styles.inspirationText}>{sparkLine}</Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.logoButton,
            pressed && !disabled && styles.logoButtonPressed,
            disabled && styles.logoButtonDisabled,
          ]}
          onPress={onLoginPress}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
          accessibilityState={{ disabled, busy: isLoading }}
        >
          <View style={styles.logoHalo} />
          <Animated.View
            style={[
              styles.logoFrame,
              {
                opacity: logoOpacity,
                transform: [{ scale: logoScale }, { translateY: logoTranslateY }],
              },
            ]}
          >
            <Image
              source={require("../../assets/akanksha-logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
            {isLoading ? (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
              </View>
            ) : null}
          </Animated.View>
          <View style={styles.googleRow}>
            <Ionicons name="logo-google" size={18} color={colors.ink} />
            <Text style={styles.googleLabel}>
              {isLoading ? "Opening Google sign-in..." : "Continue with Google"}
            </Text>
          </View>
          <Text style={styles.googleHint}>Tap the logo to begin your creative journey</Text>
        </Pressable>

        <View style={styles.missionRow}>
          {["Aspire", "Achieve", "Be The Change"].map((label) => (
            <View key={label} style={styles.missionPill}>
              <Text style={styles.missionText}>{label}</Text>
            </View>
          ))}
        </View>

        {loginError ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={18} color={colors.brand} />
            <Text style={styles.errorText}>{loginError}</Text>
          </View>
        ) : null}

        <Text style={styles.footerNote}>Sign in with your Akanksha Google account to continue.</Text>
      </ScrollView>

      <StatusBar style={isDark ? "light" : "dark"} />
    </SafeAreaView>
  );
}

function getStyles(isDark: boolean, isCompact: boolean) {
  const colors = isDark ? darkPalette : palette;

  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: isDark ? "#0a1020" : "#fff8f4",
    },
    glowTop: {
      position: "absolute",
      top: -80,
      right: -40,
      width: 220,
      height: 220,
      borderRadius: 110,
      backgroundColor: isDark ? "rgba(255, 90, 106, 0.22)" : "rgba(226, 55, 68, 0.18)",
    },
    glowBottom: {
      position: "absolute",
      bottom: -60,
      left: -50,
      width: 200,
      height: 200,
      borderRadius: 100,
      backgroundColor: isDark ? "rgba(255, 212, 42, 0.14)" : "rgba(255, 212, 42, 0.28)",
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: "center",
      paddingHorizontal: isCompact ? 18 : 24,
      paddingVertical: isCompact ? 20 : 28,
      gap: isCompact ? 14 : 18,
    },
    hero: {
      gap: 8,
    },
    eyebrow: {
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 1.4,
      textTransform: "uppercase",
      color: colors.brand,
    },
    headline: {
      fontSize: isCompact ? 38 : 46,
      fontWeight: "900",
      lineHeight: isCompact ? 42 : 50,
      color: colors.ink,
      letterSpacing: -0.5,
    },
    tagline: {
      fontSize: isCompact ? 14 : 16,
      lineHeight: isCompact ? 22 : 26,
      color: colors.inkSoft,
      maxWidth: 340,
    },
    inspirationCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: isDark ? "#3a2f14" : "#ffe6a8",
      backgroundColor: isDark ? "rgba(255, 212, 42, 0.08)" : "rgba(255, 212, 42, 0.22)",
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    inspirationText: {
      flex: 1,
      fontSize: 13,
      fontWeight: "600",
      lineHeight: 20,
      color: isDark ? "#f5df9b" : "#6b4f00",
    },
    logoButton: {
      alignItems: "center",
      gap: 10,
      paddingVertical: 8,
    },
    logoButtonPressed: {
      opacity: 0.92,
      transform: [{ scale: 0.98 }],
    },
    logoButtonDisabled: {
      opacity: 0.65,
    },
    logoHalo: {
      position: "absolute",
      top: isCompact ? 6 : 10,
      width: isCompact ? 200 : 232,
      height: isCompact ? 112 : 128,
      borderRadius: 24,
      backgroundColor: isDark ? "rgba(255, 90, 106, 0.2)" : "rgba(226, 55, 68, 0.12)",
    },
    logoFrame: {
      width: isCompact ? 188 : 216,
      height: isCompact ? 104 : 120,
      borderRadius: 22,
      borderWidth: 2,
      borderColor: isDark ? "#4a5f88" : "#ffd6db",
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      boxShadow: isDark ? undefined : "0px 10px 28px rgba(226, 55, 68, 0.18)",
      elevation: 6,
    },
    logoImage: {
      width: isCompact ? 168 : 192,
      height: isCompact ? 88 : 100,
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.35)",
    },
    googleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginTop: 4,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: isDark ? colors.border : "#e8ecf3",
      backgroundColor: colors.surface,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    googleLabel: {
      fontSize: 15,
      fontWeight: "800",
      color: colors.ink,
    },
    googleHint: {
      fontSize: 12,
      color: colors.inkSoft,
      fontWeight: "600",
    },
    missionRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: 8,
    },
    missionPill: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: isDark ? "#2f456f" : "#f0c9ce",
      backgroundColor: isDark ? "#15233d" : "#fff1f2",
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    missionText: {
      fontSize: 11,
      fontWeight: "700",
      color: isDark ? "#ffb4bc" : colors.brand,
      letterSpacing: 0.3,
    },
    errorCard: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? "#5a2430" : "#f5c2c9",
      backgroundColor: isDark ? "rgba(255, 90, 106, 0.12)" : "#fff1f2",
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    errorText: {
      flex: 1,
      fontSize: 13,
      lineHeight: 20,
      fontWeight: "600",
      color: isDark ? "#ffb4bc" : colors.brandDark,
    },
    footerNote: {
      textAlign: "center",
      fontSize: 12,
      color: colors.inkSoft,
      lineHeight: 18,
    },
  });
}
