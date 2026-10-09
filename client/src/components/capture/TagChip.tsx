import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCaptureTheme } from "../../theme/useCaptureTheme";

export type TagChipProps = { label: string; icon?: keyof typeof MaterialCommunityIcons.glyphMap };

/** Quiet metadata chip with an optional leading icon (event name, cost center code...). */
export function TagChip({ label, icon }: TagChipProps) {
  const { c, layout } = useCaptureTheme();
  return (
    <View style={[styles.chip, { backgroundColor: c.surfaceContainerLow, borderRadius: layout.radius.default - 2 }]}>
      {icon ? <MaterialCommunityIcons name={icon} size={13} color={c.onSurfaceVariant} /> : null}
      <Text style={[styles.text, { color: c.onSurfaceVariant }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, maxWidth: "100%" },
  text: { fontFamily: "Inter_600SemiBold", fontSize: 11, lineHeight: 14 },
});
