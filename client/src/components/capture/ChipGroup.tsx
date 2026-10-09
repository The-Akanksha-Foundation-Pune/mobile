import { Pressable, StyleSheet, Text, View } from "react-native";
import type { SelectOption } from "./FilterSelect";
import { useCaptureTheme } from "../../theme/useCaptureTheme";

type ChipProps = { label: string; active: boolean; onPress: () => void };

/** Selectable 36px chip: outlined when idle, solid navy when active. */
export function FilterChip({ label, active, onPress }: ChipProps) {
  const { c, type, layout } = useCaptureTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={({ pressed }) => [
        styles.chip,
        {
          borderRadius: layout.radius.full,
          minHeight: layout.control.chipHeight,
          backgroundColor: active ? c.neutral : pressed ? c.surfaceContainerLow : c.surfaceCard,
          borderColor: active ? c.neutral : c.chipBorder,
        },
      ]}
    >
      <Text style={[type.labelMd, { color: active ? "#ffffff" : c.onSurface }]}>{label}</Text>
    </Pressable>
  );
}

type GroupProps = {
  options: SelectOption[];
  valueId: string;
  onChange: (id: string) => void;
  /** Adds a leading chip that clears the selection (id ""). */
  allLabel?: string;
};

/** Single-select wrap of chips. */
export function ChipGroup({ options, valueId, onChange, allLabel }: GroupProps) {
  const rows = allLabel ? [{ id: "", label: allLabel }, ...options] : options;
  return (
    <View style={styles.group}>
      {rows.map((option) => (
        <FilterChip key={option.id || "__all"} label={option.label} active={option.id === valueId} onPress={() => onChange(option.id)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 14, justifyContent: "center", borderWidth: 1 },
  group: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
