import { StyleSheet, Text, TextInput, type TextInputProps, View } from "react-native";
import { useCaptureTheme } from "../../theme/useCaptureTheme";

type Props = TextInputProps & { label?: string; multiline?: boolean };

/** Text input from the design system: 48px, white, light border, 8px radius, optional label above. */
export function CaptureInput({ label, multiline = false, style, ...rest }: Props) {
  const { c, type, layout } = useCaptureTheme();
  return (
    <View style={styles.wrap}>
      {label ? <Text style={[type.labelMd, { color: c.onSurfaceVariant }]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={c.onSurfaceVariant}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        style={[
          styles.input,
          type.bodyMd,
          {
            minHeight: multiline ? 96 : layout.control.inputHeight,
            borderRadius: layout.radius.default,
            backgroundColor: c.surfaceCard,
            borderColor: "#D0D5DD",
            color: c.onSurface,
          },
          style,
        ]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  input: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12 },
});
