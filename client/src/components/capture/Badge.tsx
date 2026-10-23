import { StyleSheet, Text, View } from "react-native";
import { useCaptureTheme } from "../../theme/useCaptureTheme";

export type BadgeTone = "primary" | "secondary" | "tertiary" | "success" | "warning" | "danger" | "info" | "neutral";

type Props = { label: string; tone?: BadgeTone; /** Pill shape for status badges; square-ish for role tags. */ pill?: boolean };

/** Small tinted label: role tags (square) or status badges (pill). */
export function Badge({ label, tone = "neutral", pill = false }: Props) {
  const { c, type, layout } = useCaptureTheme();
  const tones: Record<BadgeTone, { bg: string; fg: string }> = {
    primary: { bg: c.primaryFixed, fg: c.onPrimaryFixedVariant },
    secondary: { bg: c.secondaryFixed, fg: c.onSecondaryFixed },
    tertiary: { bg: c.tertiaryFixed, fg: c.onTertiaryFixed },
    success: { bg: "rgba(3,152,85,0.12)", fg: c.statusSuccess },
    warning: { bg: "rgba(247,144,9,0.14)", fg: c.pendingText },
    danger: { bg: "rgba(217,45,32,0.12)", fg: c.statusDanger },
    info: { bg: "rgba(2,106,162,0.12)", fg: c.statusInfo },
    neutral: { bg: c.surfaceContainer, fg: c.onSurfaceVariant },
  };
  const { bg, fg } = tones[tone] ?? tones.neutral;
  return (
    <View
      style={[
        styles.badge,
        pill ? { borderRadius: layout.radius.full, minHeight: layout.control.badgeHeight, paddingHorizontal: 10 } : { borderRadius: layout.radius.sm },
        { backgroundColor: bg },
      ]}
    >
      <Text style={[type.labelSm, { color: fg, fontSize: pill ? 11 : 10, letterSpacing: pill ? 0.2 : 0 }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: "flex-start", paddingHorizontal: 6, paddingVertical: 2, justifyContent: "center" },
});
