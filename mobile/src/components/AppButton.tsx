import { Pressable, StyleSheet, Text } from "react-native";

type AppButtonVariant = "primary" | "secondary" | "muted";

type AppButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: AppButtonVariant;
};

export function AppButton(props: AppButtonProps) {
  const { label, onPress, disabled = false, variant = "primary" } = props;

  return (
    <Pressable
      style={[
        styles.button,
        variant === "secondary" && styles.buttonSecondary,
        variant === "muted" && styles.buttonMuted,
        disabled && styles.buttonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={[styles.buttonText, variant === "muted" && styles.buttonTextMuted]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#2c57d2",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonSecondary: {
    backgroundColor: "#36588f",
  },
  buttonMuted: {
    backgroundColor: "#e2e8f6",
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  buttonTextMuted: { color: "#24344f", fontSize: 12 },
});
