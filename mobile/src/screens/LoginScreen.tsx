import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppButton, AppCard } from "../components";

type LoginScreenProps = {
  isLoading: boolean;
  canStartLogin: boolean;
  onLoginPress: () => void;
};

export function LoginScreen(props: LoginScreenProps) {
  const { isLoading, canStartLogin, onLoginPress } = props;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <AppCard>
          <Text style={styles.title}>Capture Akanksha</Text>
          <Text style={styles.subtitle}>Sign in with your Akanksha Google account</Text>
          <AppButton
            label={isLoading ? "Signing in..." : "Continue with Google"}
            onPress={onLoginPress}
            disabled={isLoading || !canStartLogin}
          />
        </AppCard>
      </View>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f7fb" },
  content: { margin: 16, marginTop: 36 },
  title: { fontSize: 24, fontWeight: "700", color: "#131722" },
  subtitle: { fontSize: 14, color: "#495267", marginBottom: 8 },
});
