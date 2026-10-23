import { Pressable, StyleSheet, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCaptureTheme } from "../../theme/useCaptureTheme";

type Props = {
  label: string;
  onPress: () => void;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap | null;
};

/** Inline link-style action ("View Hub ›", "Read Story →"). */
export function TextButton({ label, onPress, icon = "chevron-right" }: Props) {
  const { c, type, layout } = useCaptureTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.btn, { borderRadius: layout.radius.default, backgroundColor: pressed ? "rgba(181,12,8,0.10)" : "transparent" }]}
    >
      <Text style={[type.labelMd, { color: c.primary }]}>{label}</Text>
      {icon ? <MaterialCommunityIcons name={icon} size={16} color={c.primary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 36, paddingHorizontal: 12 },
});
