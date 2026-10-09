import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { useCaptureTheme } from "../../theme/useCaptureTheme";

export type PillTab = { id: string; label: string; count?: number };

type Props = {
  tabs: PillTab[];
  activeId: string;
  onSelect: (id: string) => void;
  /** "primary" fills the active pill red; "inverse" fills it dark navy (directory style). */
  variant?: "primary" | "inverse";
  size?: "sm" | "md";
};

/** Horizontal status pills; the active one is filled with the primary color. */
export function PillTabs({ tabs, activeId, onSelect, variant = "primary", size = "sm" }: Props) {
  const { c, type, layout } = useCaptureTheme();
  const activeBg = variant === "inverse" ? c.inverseSurface : c.primary;
  const activeFg = variant === "inverse" ? c.inverseOnSurface : c.onPrimary;
  const idleBg = variant === "inverse" ? c.surfaceContainerLow : c.surfaceContainer;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <Pressable
            key={tab.id}
            onPress={() => onSelect(tab.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              styles.pill,
              {
                borderRadius: layout.radius.full,
                backgroundColor: active ? activeBg : idleBg,
                minHeight: size === "md" ? 36 : 32,
                paddingVertical: size === "md" ? 8 : 6,
              },
              pressed && styles.pressed,
            ]}
          >
            <Text style={[type.labelMd, { color: active ? activeFg : c.onSurfaceVariant }]}>
              {tab.label}
              {tab.count !== undefined ? ` (${tab.count})` : ""}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingBottom: 4 },
  pill: { paddingHorizontal: 14, justifyContent: "center" },
  pressed: { transform: [{ scale: 0.95 }] },
});
