import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";

type SelectChipProps = {
  label: string;
  isActive: boolean;
  onPress: () => void;
  iconName?: keyof typeof Ionicons.glyphMap;
};

export function SelectChip(props: SelectChipProps) {
  const { label, isActive, onPress, iconName } = props;
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const styles = useMemo(() => getStyles(isDark), [isDark]);

  return (
    <Pressable
      style={({ pressed }) => [styles.choice, isActive && styles.choiceActive, pressed && styles.choicePressed]}
      onPress={onPress}
    >
      <View style={styles.content}>
        {iconName ? (
          <Ionicons
            name={iconName}
            size={14}
            color={isActive ? (isDark ? "#8ab4ff" : "#1f4ccf") : isDark ? "#97aacd" : "#3f4f6b"}
          />
        ) : null}
        <Text style={[styles.choiceText, isActive && styles.choiceTextActive]}>{label}</Text>
      </View>
    </Pressable>
  );
}

function getStyles(isDark: boolean) {
  return StyleSheet.create({
    choice: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: isDark ? "#33476c" : "#d7deef",
      paddingHorizontal: 14,
      paddingVertical: 9,
      backgroundColor: isDark ? "#1b2740" : "#f9fbff",
    },
    choiceActive: {
      backgroundColor: isDark ? "#213456" : "#e2ecff",
      borderColor: isDark ? "#7096ff" : "#4f74f9",
    },
    choicePressed: { opacity: 0.85 },
    content: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    choiceText: { fontSize: 13, fontWeight: "600", color: isDark ? "#c0d0f3" : "#3f4f6b" },
    choiceTextActive: { color: isDark ? "#8ab4ff" : "#1f4ccf" },
  });
}
