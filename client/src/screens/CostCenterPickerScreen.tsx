import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import type { City, CostCenter } from "../types/app";
import { AppHeader } from "../components";
import { darkPalette, palette } from "../theme/theme";
import { layout } from "../theme/layout";

type CostCenterPickerScreenProps = {
  selectedCity: City;
  costCenters: CostCenter[];
  userName: string;
  onBack: () => void;
  onSelectCostCenter: (center: CostCenter) => void;
  onSkip: () => void;
};

export function CostCenterPickerScreen({
  selectedCity,
  costCenters,
  userName,
  onBack,
  onSelectCostCenter,
  onSkip,
}: CostCenterPickerScreenProps) {
  const [query, setQuery] = useState("");
  const isDark = useColorScheme() === "dark";
  const styles = useMemo(() => getStyles(isDark), [isDark]);
  const colors = isDark ? darkPalette : palette;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return costCenters;
    return costCenters.filter(
      (cc) => cc.name.toLowerCase().includes(q) || cc.code.toLowerCase().includes(q)
    );
  }, [costCenters, query]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AppHeader title="Select cost center" subtitle={selectedCity.name} onBack={onBack} />
      <Text style={styles.intro}>
        Hi {userName.split(" ")[0]}, choose the cost center for events and donor updates, or skip to see
        everything in {selectedCity.name}.
      </Text>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.inkSoft} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search cost center or code"
          placeholderTextColor={colors.inkSoft}
          style={styles.searchInput}
        />
      </View>

      <Text style={styles.sectionTitle}>Cost centers in {selectedCity.name}</Text>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Pressable
            style={({ pressed }) => [styles.row, styles.skipRow, pressed && styles.pressed]}
            onPress={onSkip}
            accessibilityLabel="Continue without a cost center"
          >
            <View style={styles.icon}>
              <Ionicons name="arrow-forward-circle" size={20} color={colors.brand} />
            </View>
            <View style={styles.textWrap}>
              <Text style={styles.name}>Skip - no cost center</Text>
              <Text style={styles.code}>Browse and add events for all of {selectedCity.name}</Text>
            </View>
            <View style={styles.chevronWrap}>
              <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
            </View>
          </Pressable>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            onPress={() => onSelectCostCenter(item)}
          >
            <View style={styles.icon}>
              <Ionicons name="grid" size={18} color={colors.brand} />
            </View>
            <View style={styles.textWrap}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.code}>{item.code}</Text>
              {item.donorCount ? (
                <Text style={styles.donors}>{item.donorCount} donor(s) registered</Text>
              ) : null}
            </View>
            <View style={styles.chevronWrap}>
              <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No cost centers mapped to {selectedCity.name}. You can skip this step.
          </Text>
        }
      />
    </SafeAreaView>
  );
}

function getStyles(isDark: boolean) {
  const colors = isDark ? darkPalette : palette;
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: isDark ? "#0d1322" : "#f4f6fa" },
    intro: {
      marginHorizontal: layout.screenPadding,
      marginTop: 12,
      fontSize: 13,
      lineHeight: 19,
      color: colors.inkSoft,
    },
    searchWrap: {
      marginHorizontal: layout.screenPadding,
      marginTop: 12,
      borderRadius: layout.radius,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      minHeight: 52,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    searchInput: { flex: 1, fontSize: 15, color: colors.ink },
    sectionTitle: {
      marginTop: 14,
      marginHorizontal: layout.screenPadding,
      fontSize: 13,
      fontWeight: "800",
      color: colors.inkSoft,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    list: { paddingHorizontal: layout.screenPadding, paddingBottom: 24, paddingTop: 6, gap: 8 },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 12,
      minHeight: 74,
    },
    pressed: { opacity: 0.9 },
    skipRow: { borderStyle: "dashed", minHeight: 64 },
    icon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#1f2b46" : "#fff0f1",
    },
    textWrap: { flex: 1, gap: 2, justifyContent: "center" },
    chevronWrap: {
      width: 20,
      alignItems: "center",
      justifyContent: "center",
    },
    name: { fontSize: 16, fontWeight: "800", color: colors.ink },
    code: { fontSize: 12, color: colors.inkSoft },
    donors: { fontSize: 11, color: colors.brand, fontWeight: "600" },
    empty: { textAlign: "center", color: colors.inkSoft, marginTop: 24, lineHeight: 20 },
  });
}
