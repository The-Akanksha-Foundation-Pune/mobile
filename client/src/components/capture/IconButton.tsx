import { Pressable, StyleSheet, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCaptureTheme } from "../../theme/useCaptureTheme";

type Props = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
  size?: number;
  /** Shows a small red dot, e.g. when filters are active. */
  badge?: boolean;
  elevated?: boolean;
  color?: string;
};

/** Square icon button (48px by default) with an optional indicator dot. */
export function IconButton({ icon, onPress, accessibilityLabel, size = 48, badge = false, elevated = false, color }: Props) {
  const { c, layout, shadow } = useCaptureTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.btn,
        elevated && shadow.level1,
        {
          width: size,
          height: size,
          borderRadius: layout.radius.md,
          backgroundColor: pressed ? c.surfaceContainerLow : c.surfaceCard,
        },
        pressed && styles.pressed,
      ]}
    >
      <MaterialCommunityIcons name={icon} size={20} color={color ?? c.onSurface} />
      {badge ? <View style={[styles.dot, { backgroundColor: c.primary }]} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { alignItems: "center", justifyContent: "center" },
  pressed: { transform: [{ scale: 0.95 }] },
  dot: { position: "absolute", top: 12, right: 12, width: 8, height: 8, borderRadius: 4 },
});
