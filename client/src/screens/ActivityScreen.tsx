import { useMemo } from "react";
import { FlatList, Image, StyleSheet, Text, View, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppHeader } from "../components";
import type { EventItem } from "../types/app";
import { darkPalette, palette } from "../theme/theme";
import { layout } from "../theme/layout";

type ActivityScreenProps = {
  events: EventItem[];
  userId: string;
  onBack: () => void;
};

/** The signed-in user's own uploads, newest first, with their review status. */
export function ActivityScreen({ events, userId, onBack }: ActivityScreenProps) {
  const isDark = useColorScheme() === "dark";
  const styles = useMemo(() => getStyles(isDark), [isDark]);
  const colors = isDark ? darkPalette : palette;

  const mine = useMemo(
    () =>
      events
        .filter((event) => event.uploadedBy === userId)
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")),
    [events, userId]
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AppHeader
        title="My activity"
        subtitle={`${mine.length} upload${mine.length === 1 ? "" : "s"}`}
        onBack={onBack}
      />
      <FlatList
        data={mine}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="images-outline" size={40} color={colors.inkSoft} />
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptyText}>Events you add will show up here with their review status.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const approved = item.approvedForGallery;
          return (
            <View style={styles.row}>
              {item.mediaType === "photo" && item.mediaUrl ? (
                <Image source={{ uri: item.mediaUrl }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbFallback]}>
                  <Ionicons name="videocam-outline" size={22} color={colors.brand} />
                </View>
              )}
              <View style={styles.body}>
                <Text style={styles.title} numberOfLines={2}>
                  {item.title || "Untitled event"}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {item.eventDate} • {item.cityName || item.location || "No location"}
                </Text>
                <View style={[styles.chip, approved ? styles.chipOk : styles.chipPending]}>
                  <Text style={[styles.chipText, approved ? styles.chipTextOk : styles.chipTextPending]}>
                    {approved ? "Approved" : "Pending review"}
                  </Text>
                </View>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

function getStyles(isDark: boolean) {
  const colors = isDark ? darkPalette : palette;
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: isDark ? "#0d1322" : "#f4f6fa" },
    list: { padding: layout.screenPadding, gap: 10, flexGrow: 1 },
    row: {
      flexDirection: "row",
      gap: 12,
      padding: 10,
      borderRadius: layout.radius,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    thumb: { width: 72, height: 72, borderRadius: 10, backgroundColor: isDark ? "#1f304f" : "#e8edf8" },
    thumbFallback: { alignItems: "center", justifyContent: "center" },
    body: { flex: 1, gap: 3, justifyContent: "center" },
    title: { fontSize: 15, fontWeight: "800", color: colors.ink },
    meta: { fontSize: 12, color: colors.inkSoft },
    chip: { alignSelf: "flex-start", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, marginTop: 2 },
    chipOk: { backgroundColor: isDark ? "rgba(74,222,128,0.16)" : "#e6f6ec" },
    chipPending: { backgroundColor: isDark ? "rgba(251,191,36,0.16)" : "#fff4dc" },
    chipText: { fontSize: 11, fontWeight: "800" },
    chipTextOk: { color: colors.success },
    chipTextPending: { color: isDark ? "#fbbf24" : "#b45309" },
    emptyWrap: { alignItems: "center", gap: 8, marginTop: 80, paddingHorizontal: 24 },
    emptyTitle: { fontSize: 16, fontWeight: "800", color: colors.ink },
    emptyText: { fontSize: 13, color: colors.inkSoft, textAlign: "center", lineHeight: 19 },
  });
}
