import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BottomSheet } from "./BottomSheet";
import { useCaptureTheme } from "../../theme/useCaptureTheme";

export type SelectOption = { id: string; label: string };

type Props = {
  /** Sheet title, e.g. "City". */
  label: string;
  /** Label for the empty value, e.g. "All Cities". */
  allLabel: string;
  options: SelectOption[];
  valueId: string;
  onChange: (id: string) => void;
};

/** Compact dropdown pill that opens an option sheet. Empty id means "all". */
export function FilterSelect({ label, allLabel, options, valueId, onChange }: Props) {
  const { c, type, layout } = useCaptureTheme();
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.id === valueId)?.label ?? allLabel;
  const rows: SelectOption[] = [{ id: "", label: allLabel }, ...options];

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Filter by ${label}: ${current}`}
        style={({ pressed }) => [
          styles.pill,
          { backgroundColor: pressed ? c.surfaceContainer : c.surfaceContainerLow, borderRadius: layout.radius.default },
        ]}
      >
        <Text style={[type.labelSm, { color: c.onSurface, fontSize: 11 }]} numberOfLines={1}>
          {current}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={16} color={c.onSurfaceVariant} />
      </Pressable>

      <BottomSheet visible={open} onClose={() => setOpen(false)} title={label}>
        <View style={styles.list}>
          {rows.map((row) => {
            const selected = row.id === valueId;
            return (
              <Pressable
                key={row.id || "__all"}
                onPress={() => {
                  onChange(row.id);
                  setOpen(false);
                }}
                style={[styles.row, { backgroundColor: selected ? c.surfaceContainer : c.surfaceContainerLow, borderRadius: layout.radius.md }]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text style={[type.labelMd, { color: c.onSurface, flex: 1 }]}>{row.label}</Text>
                {selected ? <MaterialCommunityIcons name="check" size={18} color={c.primary} /> : null}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: "row", alignItems: "center", gap: 2, paddingVertical: 6, paddingLeft: 10, paddingRight: 6, minHeight: 28 },
  list: { gap: 8, paddingBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48, paddingHorizontal: 12 },
});
