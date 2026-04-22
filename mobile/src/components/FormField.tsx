import { StyleSheet, Text, TextInput, type TextInputProps } from "react-native";

type FormFieldProps = TextInputProps & {
  label: string;
  multiline?: boolean;
};

export function FormField(props: FormFieldProps) {
  const { label, multiline = false, style, ...restProps } = props;

  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={[styles.input, multiline && styles.textArea, style]} multiline={multiline} {...restProps} />
    </>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: "600", color: "#293044" },
  input: {
    borderWidth: 1,
    borderColor: "#d0d7e6",
    borderRadius: 10,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  textArea: { minHeight: 80, textAlignVertical: "top" },
});
