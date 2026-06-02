import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, TextInput, View, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import type { City } from "../types/app";
import { darkPalette, palette } from "../theme/theme";

type CityPickerScreenProps = {
  cities: City[];
  userName: string;
  onSelectCity: (city: City) => void;
  onDetectLocation?: () => void;
};

export function CityPickerScreen({ cities, userName, onSelectCity, onDetectLocation }: CityPickerScreenProps) {
  const [query, setQuery] = useState("");
  const isDark = useColorScheme() === "dark";
  const styles = useMemo(() => getStyles(isDark), [isDark]);
  const colors = isDark ? darkPalette : palette;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cities;
    return cities.filter(
      (city) => city.name.toLowerCase().includes(q) || (city.state || "").toLowerCase().includes(q)
    );
  }, [cities, query]);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.hero}>
        <Text style={styles.brand}>CaptureAkanksha</Text>
        <Text style={styles.greeting}>Hi {userName.split(" ")[0]}, select your city</Text>
        <Text style={styles.subtitle}>Then choose a cost center to view and capture events</Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.inkSoft} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search for your city"
          placeholderTextColor={colors.inkSoft}
          style={styles.searchInput}
        />
        {onDetectLocation ? (
          <Pressable onPress={onDetectLocation} style={styles.detectBtn}>
            <Ionicons name="locate" size={18} color={colors.brand} />
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.sectionTitle}>Cities</Text>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable style={({ pressed }) => [styles.cityRow, pressed && styles.pressed]} onPress={() => onSelectCity(item)}>
            <View style={styles.cityIcon}>
              <Ionicons name="business" size={20} color={colors.brand} />
            </View>
            <Text style={styles.cityName}>{item.name}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
          </Pressable>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No cities found.</Text>}
      />
    </SafeAreaView>
  );
}

function getStyles(isDark: boolean) {
  const colors = isDark ? darkPalette : palette;
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: isDark ? "#0d1322" : "#f4f6fa" },
    hero: {
      paddingHorizontal: 18,
      paddingTop: 8,
      paddingBottom: 14,
      backgroundColor: colors.brand,
      borderBottomLeftRadius: 22,
      borderBottomRightRadius: 22,
    },
    brand: {
      color: "#fff",
      fontSize: 13,
      fontWeight: "800",
      letterSpacing: 1,
      textTransform: "uppercase",
    },
    greeting: {
      color: "#fff",
      fontSize: 24,
      fontWeight: "800",
      marginTop: 8,
    },
    subtitle: {
      color: "rgba(255,255,255,0.88)",
      fontSize: 13,
      marginTop: 4,
    },
    searchWrap: {
      marginHorizontal: 18,
      marginTop: -18,
      borderRadius: 14,
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
    detectBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#1a2640" : "#fff0f1",
    },
    sectionTitle: {
      marginTop: 18,
      marginHorizontal: 18,
      fontSize: 13,
      fontWeight: "800",
      color: colors.inkSoft,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    list: { paddingHorizontal: 18, paddingBottom: 24, paddingTop: 8, gap: 8 },
    cityRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14,
    },
    pressed: { opacity: 0.9 },
    cityIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#1f2b46" : "#fff0f1",
    },
    cityName: { flex: 1, fontSize: 16, fontWeight: "800", color: colors.ink },
    empty: { textAlign: "center", color: colors.inkSoft, marginTop: 24 },
  });
}
