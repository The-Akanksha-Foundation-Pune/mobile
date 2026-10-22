import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { ContentKind } from "../../types/app";
import { useCaptureTheme } from "../../theme/useCaptureTheme";
import { RemoteImage } from "./RemoteImage";

type Props = {
  kind: ContentKind;
  title: string;
  /** Friendly date, e.g. "Today, 3:40 pm", "Yesterday", "Sat 10 Oct". */
  dateLabel: string;
  imageUri?: string;
  isVideo?: boolean;
  /** Posts and stories: who uploaded it. */
  authorName?: string;
  /** Posts and stories: the event they belong to. */
  eventName?: string;
  /** Where it happened, e.g. "Hadapsar Centre, Pune". */
  locationLabel?: string;
  onPress?: () => void;
};

const KIND: Record<ContentKind, { label: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }> = {
  event: { label: "Event", icon: "calendar-month" },
  post: { label: "Post", icon: "image-outline" },
  story: { label: "Story", icon: "book-open-page-variant" },
};

/**
 * One compact card for every feed item, in a fixed order:
 * [image with kind tag] -> title + arrow -> one meta line (author · event · date).
 * Every card keeps the image area so the list stays even; with no image, or one that fails
 * to load, it shows the kind's icon instead.
 */
export function FeedCard({ kind, title, dateLabel, imageUri, isVideo, authorName, eventName, locationLabel, onPress }: Props) {
  const { c, type, layout, shadow } = useCaptureTheme();
  const meta = KIND[kind];
  const tagColor = kind === "event" ? c.primary : kind === "story" ? c.secondary : c.tertiary;

  const tag = (
    <View style={[styles.tag, { backgroundColor: tagColor, borderRadius: layout.radius.full }]}>
      <MaterialCommunityIcons name={meta.icon} size={11} color="#fff" />
      <Text style={[type.labelSm, styles.tagText]}>{meta.label}</Text>
    </View>
  );

  const dateChip = (
    <View style={[styles.dateChip, { borderRadius: layout.radius.full, backgroundColor: "rgba(16,24,40,0.62)" }]}>
      <MaterialCommunityIcons name="clock-outline" size={11} color="#fff" />
      <Text style={[type.labelSm, { color: "#fff", fontSize: 10 }]} numberOfLines={1}>
        {dateLabel}
      </Text>
    </View>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`${meta.label}: ${title}. View details`}
      style={({ pressed }) => [
        styles.card,
        shadow.level1,
        { backgroundColor: pressed ? c.surfaceContainerLow : c.surfaceCard, borderRadius: layout.radius.md },
      ]}
    >
      <View style={[styles.media, { backgroundColor: c.surfaceContainer }]}>
        <RemoteImage uri={imageUri} fallbackIcon={isVideo ? null : meta.icon} fallbackIconSize={36} />
        <View style={styles.overlayRow}>
          {tag}
          {dateChip}
        </View>
        {isVideo ? (
          <View style={styles.playWrap}>
            <MaterialCommunityIcons name="play-circle" size={40} color="#fff" />
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <View style={styles.textCol}>
          <Text style={[type.bodyLg, styles.title, { color: c.onSurface }]} numberOfLines={2}>
            {title}
          </Text>
          {authorName || eventName ? (
            <View style={styles.metaRow}>
              {authorName ? (
                <View style={styles.metaItem}>
                  <MaterialCommunityIcons name="account-circle-outline" size={13} color={c.onSurfaceVariant} />
                  <Text style={[type.bodySm, { color: c.onSurfaceVariant }]} numberOfLines={1}>
                    {authorName}
                  </Text>
                </View>
              ) : null}
              {authorName && eventName ? <Text style={[type.bodySm, { color: c.outlineVariant }]}>•</Text> : null}
              {eventName ? (
                <View style={[styles.metaItem, styles.shrink]}>
                  <MaterialCommunityIcons name="calendar-month-outline" size={12} color={c.onSurfaceVariant} />
                  <Text style={[type.bodySm, styles.shrink, { color: c.onSurfaceVariant }]} numberOfLines={1}>
                    {eventName}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
          {locationLabel ? (
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="map-marker-outline" size={12} color={c.onSurfaceVariant} />
              <Text style={[type.bodySm, styles.shrink, { color: c.onSurfaceVariant }]} numberOfLines={1}>
                {locationLabel}
              </Text>
            </View>
          ) : null}
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color={c.onSurfaceVariant} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { overflow: "hidden" },
  shrink: { flexShrink: 1 },
  title: { fontFamily: "PlusJakartaSans_700Bold", fontSize: 15, lineHeight: 20 },
  media: { aspectRatio: 16 / 9 },
  overlayRow: { position: "absolute", top: 8, left: 8, right: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, height: 20 },
  tagText: { color: "#fff", fontSize: 10 },
  dateChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, height: 20 },
  playWrap: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.18)" },
  body: { flexDirection: "row", alignItems: "center", gap: 4, paddingLeft: 12, paddingRight: 6, paddingVertical: 10 },
  textCol: { flex: 1, gap: 4 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
});
