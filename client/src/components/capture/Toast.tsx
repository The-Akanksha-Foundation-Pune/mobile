import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCaptureTheme } from "../../theme/useCaptureTheme";

export type ToastTone = "success" | "warning";

type Props = { visible: boolean; message: string; tone?: ToastTone };

/** Dark notice pinned near the top of the screen. The parent controls visibility and timing. */
export function Toast({ visible, message, tone = "success" }: Props) {
  const { c, type, layout, shadow } = useCaptureTheme();
  if (!visible) return null;
  return (
    <View style={[styles.toast, shadow.level2, { backgroundColor: c.inverseSurface, borderRadius: layout.radius.md }]} pointerEvents="none">
      <MaterialCommunityIcons
        name={tone === "success" ? "check-circle" : "information"}
        size={20}
        color={tone === "success" ? c.statusSuccess : c.statusWarning}
      />
      <Text style={[type.bodySm, { color: c.inverseOnSurface, flex: 1 }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: { position: "absolute", top: 16, left: 16, right: 16, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
});
