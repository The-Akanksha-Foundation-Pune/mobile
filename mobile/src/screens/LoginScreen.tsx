import { StatusBar } from "expo-status-bar";
import { useMemo } from "react";
import { StyleSheet, Text, View, useColorScheme } from "react-native";
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
        <AppCard>
          <Text style={styles.eyebrow}>Event Capture Platform</Text>
          <Text style={styles.title}>Capture Akanksha</Text>
          <Text style={styles.subtitle}>Sign in with your Akanksha Google account to continue.</Text>
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
    safe: { flex: 1, backgroundColor: isDark ? "#0f1627" : "#f2f6ff" },
    content: { flex: 1, justifyContent: "center", margin: 18 },
    eyebrow: {
      fontSize: 12,
      fontWeight: "700",
      color: isDark ? "#8db1ff" : "#4b69b5",
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    title: { fontSize: 30, fontWeight: "800", color: isDark ? "#e4edff" : "#16223c", letterSpacing: 0.3 },
    subtitle: { fontSize: 14, color: isDark ? "#afc0e2" : "#627294", marginBottom: 6, lineHeight: 20 },
  });
}
