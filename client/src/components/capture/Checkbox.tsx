import { Pressable, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCaptureTheme } from "../../theme/useCaptureTheme";

type Props = { checked: boolean; onChange: (next: boolean) => void; size?: number; label?: string };

/** 16px checkbox with a 44px hit area. */
export function Checkbox({ checked, onChange, size = 16, label }: Props) {
  const { c } = useCaptureTheme();
  return (
    <Pressable
      onPress={() => onChange(!checked)}
      hitSlop={14}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label ?? "Select"}
      style={[
        styles.box,
        { width: size, height: size, borderColor: checked ? c.primary : c.outline, backgroundColor: checked ? c.primary : "transparent" },
      ]}
    >
      {checked ? <MaterialCommunityIcons name="check" size={size - 4} color={c.onPrimary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({ box: { borderRadius: 4, borderWidth: 1.5, alignItems: "center", justifyContent: "center" } });
