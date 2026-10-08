import { ReactNode, useMemo } from "react";
import { Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { darkPalette, palette } from "../theme/theme";
import { layout } from "../theme/layout";

type AppHeaderProps = {
  title: string;
  subtitle?: string;
  /** Shows the back button when provided. */
  onBack?: () => void;
  /** Optional action(s) on the right edge. */
  right?: ReactNode;
};

/** Brand header used by every inner screen: back button, title, optional right action. */
export function AppHeader({ title, subtitle, onBack, right }: AppHeaderProps) {
  const isDark = useColorScheme() === "dark";
  const styles = useMemo(() => getStyles(isDark), [isDark]);

  return (
    <View style={styles.bar}>
      <View style={styles.side}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={8}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.center}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={[styles.side, styles.sideRight]}>{right}</View>
    </View>
  );
}

function getStyles(isDark: boolean) {
  const colors = isDark ? darkPalette : palette;
  return StyleSheet.create({
    bar: {
      minHeight: layout.headerHeight,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 8,
      backgroundColor: colors.brand,
    },
    side: { width: layout.touchTarget + 4, alignItems: "flex-start", justifyContent: "center" },
    sideRight: { alignItems: "flex-end" },
    center: { flex: 1, justifyContent: "center" },
    iconBtn: {
      width: layout.touchTarget,
      height: layout.touchTarget,
      borderRadius: layout.touchTarget / 2,
      alignItems: "center",
      justifyContent: "center",
    },
    pressed: { backgroundColor: "rgba(255,255,255,0.18)" },
    title: { color: "#fff", fontSize: 18, fontWeight: "800" },
    subtitle: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 1 },
  });
}
