import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCaptureTheme } from "../../theme/useCaptureTheme";

type Props = {
  visible?: boolean;
  count: number;
  noun?: string;
  actionLabel: string;
  actionIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
  onAction: () => void;
  busy?: boolean;
};

/** Dark floating bar that appears above the tab bar while items are selected. */
export function BulkActionDock({ visible = true, count, noun = "item", actionLabel, actionIcon = "check-all", onAction, busy }: Props) {
  const { c, type, layout, shadow } = useCaptureTheme();
  if (!visible || count === 0) return null;
  return (
    <View style={[styles.dock, shadow.level3, { backgroundColor: c.inverseSurface, borderRadius: layout.radius.lg }]}>
      <View style={styles.left}>
        <View style={[styles.countBadge, { backgroundColor: c.primary }]}>
          <Text style={[type.labelSm, { color: c.onPrimary, fontSize: 11 }]}>{count}</Text>
        </View>
        <Text style={[type.labelMd, { color: c.inverseOnSurface }]}>
          {count} {noun}
          {count === 1 ? "" : "s"} selected
        </Text>
      </View>
      <Pressable
        onPress={onAction}
        disabled={busy}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.action,
          { backgroundColor: c.statusSuccess, borderRadius: layout.radius.md, opacity: busy ? 0.6 : 1 },
          pressed && styles.pressed,
        ]}
      >
        <MaterialCommunityIcons name={actionIcon} size={16} color="#fff" />
        <Text style={[type.labelMd, { color: "#fff" }]}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  left: { flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 1 },
  countBadge: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  action: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 14, paddingVertical: 8, minHeight: 36 },
  pressed: { transform: [{ scale: 0.95 }] },
});
