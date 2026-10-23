import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCaptureTheme } from "../../theme/useCaptureTheme";

type Props = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  description?: string;
  onPress: () => void;
};

/** Tappable row for choice sheets: icon circle, label, description, chevron. */
export function OptionRow({ icon, label, description, onPress }: Props) {
  const { c, type, layout } = useCaptureTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? c.surfaceContainer : c.surfaceContainerLow, borderRadius: layout.radius.md }]}
    >
      <View style={[styles.iconWrap, { backgroundColor: c.surfaceContainerHigh }]}>
        <MaterialCommunityIcons name={icon} size={20} color={c.primary} />
      </View>
      <View style={styles.text}>
        <Text style={[type.labelLg, { color: c.onSurface }]} numberOfLines={1}>
          {label}
        </Text>
        {description ? (
          <Text style={[type.bodySm, { color: c.onSurfaceVariant }]} numberOfLines={2}>
            {description}
          </Text>
        ) : null}
      </View>
      <MaterialCommunityIcons name="chevron-right" size={20} color={c.onSurfaceVariant} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 64, paddingHorizontal: 12, paddingVertical: 10 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  text: { flex: 1, gap: 2 },
});
