import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";

type AppButtonVariant = "primary" | "secondary" | "muted";
type IconName = keyof typeof Ionicons.glyphMap;

type AppButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: AppButtonVariant;
  iconName?: IconName;
};

export function AppButton(props: AppButtonProps) {
  const { label, onPress, disabled = false, variant = "primary", iconName } = props;
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const styles = useMemo(() => getStyles(isDark), [isDark]);
  const iconColor = variant === "muted" ? (isDark ? "#c8d6ff" : "#24344f") : "#ffffff";

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" && styles.buttonSecondary,
        variant === "muted" && styles.buttonMuted,
        disabled && styles.buttonDisabled,
        pressed && !disabled && styles.buttonPressed,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.content}>
        {iconName ? <Ionicons name={iconName} size={16} color={iconColor} /> : null}
        <Text style={[styles.buttonText, variant === "muted" && styles.buttonTextMuted]}>{label}</Text>
      </View>
    </Pressable>
  );
}

function getStyles(isDark: boolean) {
  const mutedBackground = isDark ? "#1e2a45" : "#edf2ff";
  const mutedBorder = isDark ? "#31466f" : "#dbe6ff";
  const mutedText = isDark ? "#c8d6ff" : "#24344f";
  const secondaryBackground = isDark ? "#415f99" : "#35548f";

  return StyleSheet.create({
    button: {
      backgroundColor: "#2f6bf2",
      borderRadius: 14,
      paddingVertical: 13,
      paddingHorizontal: 14,
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0px 6px 12px rgba(47, 107, 242, 0.2)",
      elevation: 2,
    },
    buttonSecondary: {
      backgroundColor: secondaryBackground,
    },
    buttonMuted: {
      backgroundColor: mutedBackground,
      borderWidth: 1,
      borderColor: mutedBorder,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonPressed: {
      transform: [{ scale: 0.985 }],
    },
    content: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    buttonText: { color: "#fff", fontWeight: "700", fontSize: 15, letterSpacing: 0.2 },
    buttonTextMuted: { color: mutedText, fontSize: 13 },
  });
}
