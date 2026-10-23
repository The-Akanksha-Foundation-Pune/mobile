import { useMemo } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCaptureTheme } from "../../theme/useCaptureTheme";

export type CaptureButtonVariant = "primary" | "secondary" | "tonal" | "success" | "danger";

type Props = {
  label: string;
  onPress: () => void;
  variant?: CaptureButtonVariant;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  /** Overrides the icon color (e.g. a red close icon on an outlined button). */
  iconColor?: string;
  size?: "md" | "sm";
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
};

/** Button from the design system: 48px (md) or 40px (sm), 12px radius, five tones. */
export function CaptureButton({
  label,
  onPress,
  variant = "primary",
  icon,
  iconColor,
  size = "md",
  disabled,
  loading,
  style,
}: Props) {
  const { c, type, layout } = useCaptureTheme();
  const tone = useMemo(() => {
    const tones = {
      primary: { bg: c.primaryContainer, fg: c.onPrimary, border: "transparent", pressed: c.primaryPressed },
      secondary: { bg: c.surfaceCard, fg: c.onSurface, border: c.outlineVariant, pressed: c.surfaceContainerLow },
      tonal: { bg: c.surfaceContainerHigh, fg: c.onSurface, border: "transparent", pressed: c.surfaceContainer },
      success: { bg: c.statusSuccess, fg: "#ffffff", border: "transparent", pressed: "#027a43" },
      danger: { bg: c.statusDanger, fg: "#ffffff", border: "transparent", pressed: "#b42318" },
    };
    return tones[variant] ?? tones.primary;
  }, [c, variant]);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.base,
        {
          minHeight: size === "md" ? layout.control.buttonHeight : 40,
          borderRadius: layout.radius.md,
          backgroundColor: pressed ? tone.pressed : tone.bg,
          borderColor: tone.border,
          borderWidth: variant === "secondary" ? 1 : 0,
          opacity: disabled ? 0.5 : 1,
        },
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={tone.fg} />
      ) : (
        <>
          {icon ? <MaterialCommunityIcons name={icon} size={18} color={iconColor ?? tone.fg} /> : null}
          <Text style={[size === "md" ? type.labelLg : type.labelMd, { color: tone.fg }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingHorizontal: 14 },
  pressed: { transform: [{ scale: 0.98 }] },
});
