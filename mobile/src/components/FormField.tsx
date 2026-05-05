import { useMemo } from "react";
import { StyleSheet, Text, TextInput, type TextInputProps, useColorScheme } from "react-native";

type FormFieldProps = TextInputProps & {
  label: string;
  multiline?: boolean;
};

export function FormField(props: FormFieldProps) {
  const { label, multiline = false, style, ...restProps } = props;
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const styles = useMemo(() => getStyles(isDark), [isDark]);

  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textArea, style]}
        multiline={multiline}
        placeholderTextColor={isDark ? "#8394b8" : "#8ca0c6"}
        {...restProps}
      />
    </>
  );
}

function getStyles(isDark: boolean) {
  return StyleSheet.create({
    label: { fontSize: 13, fontWeight: "600", color: isDark ? "#b8c6e7" : "#3a4966" },
    input: {
      borderWidth: 1,
      borderColor: isDark ? "#324566" : "#d6dff2",
      borderRadius: 14,
      backgroundColor: isDark ? "#1b2740" : "#fbfcff",
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: isDark ? "#e4edff" : "#1f2a44",
    },
    textArea: { minHeight: 96, textAlignVertical: "top" },
  });
}
