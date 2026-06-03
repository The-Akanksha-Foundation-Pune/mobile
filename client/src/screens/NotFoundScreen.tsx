import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppButton, AppCard } from "../components";

type NotFoundScreenProps = {
  onGoHome: () => void;
  onGoLogin: () => void;
};

export function NotFoundScreen(props: NotFoundScreenProps) {
  const { onGoHome, onGoLogin } = props;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <AppCard>
          <Text style={styles.title}>404</Text>
          <Text style={styles.subtitle}>Page not found in this app.</Text>
          <AppButton label="Go to Home" onPress={onGoHome} />
          <AppButton label="Go to Login" onPress={onGoLogin} variant="secondary" />
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
