import { type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

type AppCardProps = {
  children: ReactNode;
  compact?: boolean;
};

export function AppCard(props: AppCardProps) {
  const { children, compact = false } = props;
  return <View style={[styles.card, compact && styles.compact]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  compact: {
    padding: 12,
  },
});
