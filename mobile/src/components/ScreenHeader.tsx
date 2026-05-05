import { useMemo } from "react";
import { StyleSheet, Text, View, useColorScheme } from "react-native";
import { AppButton } from "./AppButton";

type ScreenHeaderProps = {
  title: string;
  subtitle: string;
  onLogout: () => void;
};

export function ScreenHeader(props: ScreenHeaderProps) {
  const { title, subtitle, onLogout } = props;
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const styles = useMemo(() => getStyles(isDark), [isDark]);

  return (
    <View style={styles.headerRow}>
      <View style={styles.headerTextWrap}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      <AppButton label="Logout" variant="muted" iconName="log-out-outline" onPress={onLogout} />
    </View>
  );
}

function getStyles(isDark: boolean) {
  return StyleSheet.create({
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12,
    },
    headerTextWrap: { flex: 1 },
    title: { fontSize: 26, fontWeight: "800", color: isDark ? "#e6eeff" : "#18233d", letterSpacing: 0.2 },
    subtitle: { fontSize: 14, color: isDark ? "#9fb2d8" : "#61708f", marginTop: 2 },
  });
}
