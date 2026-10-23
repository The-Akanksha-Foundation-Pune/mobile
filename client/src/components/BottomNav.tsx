import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { darkPalette, palette } from "../theme/theme";
import { layout } from "../theme/layout";

export type BottomNavItem = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon?: keyof typeof Ionicons.glyphMap;
  /** Renders as the raised round button in the middle of the bar. */
  primary?: boolean;
};

type BottomNavProps = {
  items: BottomNavItem[];
  activeId: string;
  onSelect: (id: string) => void;
};

/** Compact bottom menu. Add or remove tabs by changing `items`. */
export function BottomNav({ items, activeId, onSelect }: BottomNavProps) {
  const isDark = useColorScheme() === "dark";
  const styles = useMemo(() => getStyles(isDark), [isDark]);
  const colors = isDark ? darkPalette : palette;
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 6) }]}>
      {items.map((item) => {
        const active = item.id === activeId;
        if (item.primary) {
          return (
            <View key={item.id} style={styles.item}>
              <Pressable
                style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
                onPress={() => onSelect(item.id)}
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                <Ionicons name={item.icon} size={30} color="#fff" />
              </Pressable>
            </View>
          );
        }
        return (
          <Pressable
            key={item.id}
            style={styles.item}
            onPress={() => onSelect(item.id)}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: active }}
          >
            <Ionicons
              name={active && item.activeIcon ? item.activeIcon : item.icon}
              size={24}
              color={active ? colors.brand : colors.inkSoft}
            />
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function getStyles(isDark: boolean) {
  const colors = isDark ? darkPalette : palette;
  return StyleSheet.create({
    bar: {
      flexDirection: "row",
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 6,
    },
    item: {
      flex: 1,
      minHeight: layout.navHeight - 12,
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
    },
    fab: {
      width: 56,
      height: 56,
      borderRadius: 28,
      marginTop: -26,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.brand,
      borderWidth: 4,
      borderColor: colors.surface,
      shadowColor: colors.brand,
      shadowOpacity: 0.35,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 8,
    },
    fabPressed: { opacity: 0.9, transform: [{ scale: 0.96 }] },
    label: { fontSize: 11, fontWeight: "700", color: colors.inkSoft },
    labelActive: { color: colors.brand },
  });
}
