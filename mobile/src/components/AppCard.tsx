import { type ReactNode, useMemo } from "react";
import { StyleSheet, View, useColorScheme } from "react-native";

type AppCardProps = {
  children: ReactNode;
  compact?: boolean;
};

export function AppCard(props: AppCardProps) {
  const { children, compact = false } = props;
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const styles = useMemo(() => getStyles(isDark), [isDark]);

  return <View style={[styles.card, compact && styles.compact]}>{children}</View>;
}

function getStyles(isDark: boolean) {
  return StyleSheet.create({
    card: {
      backgroundColor: isDark ? "#162035" : "#ffffff",
      borderRadius: 20,
      padding: 18,
      gap: 12,
      borderWidth: 1,
      borderColor: isDark ? "#283754" : "#e8eefb",
      boxShadow: isDark ? "0px 8px 18px rgba(0, 0, 0, 0.2)" : "0px 8px 18px rgba(31, 59, 122, 0.08)",
      elevation: 3,
    },
    compact: {
      padding: 14,
    },
  });
}
