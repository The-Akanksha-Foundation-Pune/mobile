import { useMemo } from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { EventItem } from "../types/app";
import { darkPalette, palette } from "../theme/theme";

type EventPosterCardProps = {
  event: EventItem;
  onPress: () => void;
  compact?: boolean;
};

export function EventPosterCard({ event, onPress, compact = false }: EventPosterCardProps) {
  const isDark = useColorScheme() === "dark";
  const styles = useMemo(() => getStyles(isDark, compact), [isDark, compact]);
  const colors = isDark ? darkPalette : palette;

  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.pressed]} onPress={onPress}>
      {event.mediaType === "photo" && event.mediaUrl ? (
        <Image source={{ uri: event.mediaUrl }} style={styles.poster} resizeMode="cover" />
      ) : (
        <View style={styles.videoFallback}>
          <Ionicons name="videocam" size={28} color={colors.brand} />
        </View>
      )}
      <View style={styles.body}>
        <Text style={styles.type}>
          {event.eventTypeName}
          {event.costCenterCode ? ` • ${event.costCenterCode}` : ""}
        </Text>
        <Text style={styles.title} numberOfLines={2}>
          {event.title || "Untitled event"}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={13} color={colors.inkSoft} />
          <Text style={styles.meta}>{event.eventDate}</Text>
        </View>
        {event.location ? (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={13} color={colors.inkSoft} />
            <Text style={styles.meta} numberOfLines={1}>
              {event.location}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function getStyles(isDark: boolean, compact: boolean) {
  const colors = isDark ? darkPalette : palette;
  return StyleSheet.create({
    card: {
      width: compact ? 168 : 220,
      borderRadius: 14,
      overflow: "hidden",
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: 12,
    },
    pressed: { opacity: 0.92 },
    poster: {
      width: "100%",
      height: compact ? 110 : 140,
      backgroundColor: isDark ? "#1f304f" : "#e8edf8",
    },
    videoFallback: {
      width: "100%",
      height: compact ? 110 : 140,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#1b2a46" : "#edf3ff",
    },
    body: { padding: 10, gap: 4 },
    type: {
      fontSize: 10,
      fontWeight: "800",
      color: colors.brand,
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    title: {
      fontSize: 14,
      fontWeight: "800",
      color: colors.ink,
      minHeight: 36,
    },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
    meta: { fontSize: 11, color: colors.inkSoft, flex: 1 },
  });
}
