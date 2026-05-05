import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import { Image, StyleSheet, Text, View, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppButton, AppCard } from "../components";

type LoginScreenProps = {
  isLoading: boolean;
  canStartLogin: boolean;
  onLoginPress: () => void;
};

export function LoginScreen(props: LoginScreenProps) {
  const { isLoading, canStartLogin, onLoginPress } = props;
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const styles = useMemo(() => getStyles(isDark), [isDark]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <View style={styles.logoWrap}>
          <Image source={require("../../assets/akanksha-logo.png")} style={styles.logo} resizeMode="contain" />
        </View>

        <AppCard>
          <Text style={styles.eyebrow}>Akanksha Events</Text>
          <Text style={styles.title}>Capture Akanksha</Text>
          <Text style={styles.subtitle}>A modern, simple event capture experience for your team.</Text>
          <View style={styles.googleOnlyPill}>
            <Text style={styles.googleOnlyText}>Google sign-in only</Text>
          </View>
          <AppButton
            label={isLoading ? "Signing in..." : "Continue with Google"}
            iconName="logo-google"
            onPress={onLoginPress}
            disabled={isLoading || !canStartLogin}
          />
        </AppCard>
      </View>
      <StatusBar style={isDark ? "light" : "dark"} />
    </SafeAreaView>
  );
}

function getStyles(isDark: boolean) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: isDark ? "#0d1322" : "#eef3ff" },
    content: { flex: 1, justifyContent: "center", margin: 18, gap: 14 },
    logoWrap: {
      alignItems: "center",
      justifyContent: "center",
    },
    logo: {
      width: 180,
      height: 96,
    },
    eyebrow: {
      fontSize: 12,
      fontWeight: "700",
      color: isDark ? "#9fbcff" : "#4a66aa",
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    title: { fontSize: 32, fontWeight: "800", color: isDark ? "#eaf1ff" : "#16223c", letterSpacing: 0.2 },
    subtitle: { fontSize: 15, color: isDark ? "#b5c5e6" : "#607297", lineHeight: 22 },
    googleOnlyPill: {
      alignSelf: "flex-start",
      borderRadius: 999,
      borderWidth: 1,
      borderColor: isDark ? "#365086" : "#c7d8ff",
      backgroundColor: isDark ? "#17233c" : "#ecf3ff",
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    googleOnlyText: {
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.3,
      color: isDark ? "#b7ccfb" : "#3258bc",
    },
  });
}
