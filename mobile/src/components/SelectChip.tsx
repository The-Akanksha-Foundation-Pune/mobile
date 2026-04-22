import { Pressable, StyleSheet, Text } from "react-native";

type SelectChipProps = {
  label: string;
  isActive: boolean;
  onPress: () => void;
};

export function SelectChip(props: SelectChipProps) {
  const { label, isActive, onPress } = props;

  return (
    <Pressable style={[styles.choice, isActive && styles.choiceActive]} onPress={onPress}>
      <Text style={styles.choiceText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  choice: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d0d7e6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
  },
  choiceActive: { backgroundColor: "#dce8ff", borderColor: "#4c78ff" },
  choiceText: { fontSize: 13, fontWeight: "600", color: "#263047" },
});
