import { StyleSheet, Text, View } from "react-native";
import { AppButton } from "./AppButton";

type ScreenHeaderProps = {
  title: string;
  subtitle: string;
  onLogout: () => void;
};

export function ScreenHeader(props: ScreenHeaderProps) {
  const { title, subtitle, onLogout } = props;

  return (
    <View style={styles.headerRow}>
      <View style={styles.headerTextWrap}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <AppButton label="Logout" variant="muted" onPress={onLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  headerTextWrap: { flex: 1 },
  title: { fontSize: 24, fontWeight: "700", color: "#131722" },
  subtitle: { fontSize: 14, color: "#495267", marginBottom: 8 },
});
