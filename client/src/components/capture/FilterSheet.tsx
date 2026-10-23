import { StyleSheet, Switch, Text, View } from "react-native";
import { BottomSheet } from "./BottomSheet";
import { CaptureButton } from "./CaptureButton";
import { ChipGroup } from "./ChipGroup";
import type { SelectOption } from "./FilterSelect";
import { useCaptureTheme } from "../../theme/useCaptureTheme";

export type FilterSection = {
  id: string;
  title: string;
  options: SelectOption[];
  valueId: string;
  onChange: (id: string) => void;
  allLabel?: string;
};

export type FilterToggle = { id: string; label: string; value: boolean; onChange: (next: boolean) => void };

type Props = {
  visible: boolean;
  onClose: () => void;
  onReset: () => void;
  title?: string;
  sections: FilterSection[];
  toggles?: FilterToggle[];
};

/** Filter drawer: chip groups per section, optional switches, Reset and Apply. */
export function FilterSheet({ visible, onClose, onReset, title = "Filters", sections, toggles = [] }: Props) {
  const { c, type } = useCaptureTheme();
  return (
    <BottomSheet visible={visible} onClose={onClose} title={title}>
      <View style={styles.body}>
        {sections.map((section) => (
          <View key={section.id} style={styles.section}>
            <Text style={[type.labelSm, styles.sectionTitle, { color: c.onSurfaceVariant }]}>{section.title.toUpperCase()}</Text>
            <ChipGroup options={section.options} valueId={section.valueId} onChange={section.onChange} allLabel={section.allLabel} />
          </View>
        ))}
        {toggles.map((toggle) => (
          <View key={toggle.id} style={styles.toggleRow}>
            <Text style={[type.bodyMd, { color: c.onSurface, flex: 1 }]}>{toggle.label}</Text>
            <Switch
              value={toggle.value}
              onValueChange={toggle.onChange}
              trackColor={{ false: c.surfaceContainerHighest, true: c.primary }}
              thumbColor="#ffffff"
              accessibilityLabel={toggle.label}
            />
          </View>
        ))}
        <View style={styles.footer}>
          <CaptureButton label="Reset" variant="tonal" onPress={onReset} style={styles.footerBtn} />
          <CaptureButton label="Apply" onPress={onClose} style={styles.footerBtn} />
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { gap: 20, paddingBottom: 8 },
  section: { gap: 10 },
  sectionTitle: { letterSpacing: 0.8 },
  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 },
  footer: { flexDirection: "row", gap: 12, marginTop: 4 },
  footerBtn: { flex: 1 },
});
