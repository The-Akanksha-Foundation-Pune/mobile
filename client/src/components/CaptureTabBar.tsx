import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { captureLayout, captureLight } from "../theme/capture";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

export type CaptureTab = {
  id: string;
  /** Screen-reader label; the bar itself shows icons only. */
  label: string;
  icon: IconName;
  activeIcon?: IconName;
  /** Raised round action button in the center of the bar. */
  primary?: boolean;
};

type CaptureTabBarProps = {
  tabs: CaptureTab[];
  activeId: string;
  onSelect: (id: string) => void;
};

/** Compact icon-only bottom bar: four tabs around a raised capture button. */
export function CaptureTabBar({ tabs, activeId, onSelect }: CaptureTabBarProps) {
  const styles = useMemo(() => getStyles(), []);
  const c = captureLight;
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
      <View style={styles.row}>
        {tabs.map((tab) => {
          const active = tab.id === activeId;
          if (tab.primary) {
            return (
              <View key={tab.id} style={styles.fabSlot}>
                <Pressable
                  onPress={() => onSelect(tab.id)}
                  style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={tab.label}
                >
                  <MaterialCommunityIcons name={tab.icon} size={26} color={c.onPrimary} />
                </Pressable>
              </View>
            );
          }
          return (
            <Pressable
              key={tab.id}
              onPress={() => onSelect(tab.id)}
              style={styles.item}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: active }}
            >
              <MaterialCommunityIcons
                name={active && tab.activeIcon ? tab.activeIcon : tab.icon}
                size={26}
                color={active ? c.primary : c.onSurfaceVariant}
              />
              <View style={[styles.dot, active && styles.dotActive]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function getStyles() {
  const c = captureLight;
  return StyleSheet.create({
    bar: {
      backgroundColor: c.surface,
      shadowColor: c.onSurface,
      shadowOpacity: 0.06,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: -4 },
      elevation: 10,
    },
    row: {
      height: captureLayout.navHeight,
      width: "100%",
      maxWidth: captureLayout.contentMaxWidth,
      alignSelf: "center",
      paddingHorizontal: captureLayout.space.sm,
      flexDirection: "row",
      alignItems: "center",
    },
    item: {
      flex: 1,
      minWidth: 48,
      height: captureLayout.navHeight,
      alignItems: "center",
      justifyContent: "center",
    },
    // Absolute so the icon stays on the bar's centre line regardless of the indicator.
    dot: { position: "absolute", bottom: 6, width: 4, height: 4, borderRadius: 2, backgroundColor: "transparent" },
    dotActive: { backgroundColor: c.primary },
    // Wider than an icon slot so the gap between the button and its neighbours
    // matches the gap between the icons themselves (icon 26px vs button 56px).
    fabSlot: { flex: 1.45, alignItems: "center", justifyContent: "center" },
    fab: {
      width: captureLayout.fabSize,
      height: captureLayout.fabSize,
      borderRadius: captureLayout.fabSize / 2,
      marginTop: -20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: c.primary,
      shadowColor: "#b50c08",
      shadowOpacity: 0.36,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 12 },
      elevation: 10,
    },
    fabPressed: { backgroundColor: c.primaryContainer, transform: [{ scale: 0.95 }] },
  });
}
