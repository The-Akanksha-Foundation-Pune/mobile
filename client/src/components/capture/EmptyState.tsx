import { StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { CaptureButton } from "./CaptureButton";
import { useCaptureTheme } from "../../theme/useCaptureTheme";

type Props = {
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  actionIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
  onAction?: () => void;
};

/** Centered card shown when a list or search has no results. */
export function EmptyState({ icon = "text-search", title, message, actionLabel, actionIcon, onAction }: Props) {
  const { c, type, layout, shadow } = useCaptureTheme();
  return (
    <View style={[styles.card, shadow.level1, { backgroundColor: c.surfaceCard, borderRadius: layout.radius.md }]}>
      <View style={[styles.iconWrap, { backgroundColor: c.surfaceContainerHigh }]}>
        <MaterialCommunityIcons name={icon} size={32} color={c.onSurfaceVariant} />
      </View>
      <Text style={[type.headlineSm, styles.center, { color: c.onSurface }]}>{title}</Text>
      {message ? <Text style={[type.bodySm, styles.center, styles.message, { color: c.onSurfaceVariant }]}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <CaptureButton label={actionLabel} icon={actionIcon} onPress={onAction} style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: "center", padding: 32, gap: 8 },
  iconWrap: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  center: { textAlign: "center" },
  message: { maxWidth: 280 },
  action: { marginTop: 12, minHeight: 44, alignSelf: "stretch" },
});
