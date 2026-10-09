import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { AvatarInitials, Badge, EmptyState, MediaPreview, TagChip, TextButton } from "../components/capture";
import type { EventItem } from "../types/app";
import { useCaptureTheme, type CaptureColors } from "../theme/useCaptureTheme";
import { authorName, formatEventDate, placeOf, reviewStatusOf, reviewStatusPresentation } from "../utils/eventPresenters";
import { formatRelativeTime } from "../utils/relativeTime";

type Props = {
  post: EventItem | null;
  onOpenParent?: (eventId: string) => void;
};

/** Inner layout of a post: author, media, caption, the event it belongs to, and details. */
export function PostDetailScreen({ post, onOpenParent }: Props) {
  const { c, type } = useCaptureTheme();
  const styles = useMemo(() => getStyles(c), [c]);

  if (!post) {
    return (
      <SafeAreaView style={styles.safe} edges={[]}>
        <View style={styles.pad}>
          <EmptyState icon="image-off-outline" title="Post not found" message="It may have been removed." />
        </View>
      </SafeAreaView>
    );
  }

  const review = reviewStatusPresentation(reviewStatusOf(post));
  const rows: { label: string; value: string }[] = [
    { label: "Date", value: formatEventDate(post.eventDate) },
    { label: "Location", value: post.location || "Not provided" },
    { label: "City", value: post.cityName || "Not provided" },
    { label: "Cost center", value: post.costCenterName ? `${post.costCenterName} (${post.costCenterCode})` : "None" },
    { label: "Uploaded", value: new Date(post.createdAt).toLocaleString() },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.author}>
            <AvatarInitials name={authorName(post)} size={40} />
            <View style={styles.authorText}>
              <Text style={[type.labelLg, { color: c.onSurface }]} numberOfLines={1}>
                {authorName(post)}
              </Text>
              <Text style={[type.bodySm, { color: c.onSurfaceVariant }]} numberOfLines={1}>
                {placeOf(post) || "No location"} • {formatRelativeTime(post.createdAt)}
              </Text>
            </View>
          </View>
          <Badge label={review.label} tone={review.tone} pill />
        </View>

        <MediaPreview uri={post.mediaUrl} kind={post.mediaType} aspectRatio={4 / 3} />

        {post.title ? <Text style={[type.headlineSm, { color: c.onSurface }]}>{post.title}</Text> : null}
        <Text style={[type.bodyLg, { color: c.onSurface }]}>{post.caption}</Text>

        {post.reviewStatus === "changes_requested" && post.reviewReason ? (
          <View style={[styles.notice, { backgroundColor: "rgba(217,45,32,0.08)" }]}>
            <MaterialCommunityIcons name="alert-circle-outline" size={18} color={c.statusDanger} />
            <Text style={[type.bodySm, { color: c.statusDanger, flex: 1 }]}>
              Changes requested: {post.reviewReason}
              {post.reviewNote ? ` — ${post.reviewNote}` : ""}
            </Text>
          </View>
        ) : null}

        {post.parentEventId ? (
          <View style={[styles.linked, { backgroundColor: c.surfaceContainerLow }]}>
            <MaterialCommunityIcons name="link-variant" size={16} color={c.tertiary} />
            <Text style={[type.labelMd, { color: c.onSurface, flex: 1 }]} numberOfLines={1}>
              Part of {post.parentTitle || "an event"}
            </Text>
            {onOpenParent ? <TextButton label="View Hub" onPress={() => onOpenParent(post.parentEventId as string)} /> : null}
          </View>
        ) : null}

        <View style={styles.tags}>
          {post.eventTypeName ? <TagChip icon="shape-outline" label={post.eventTypeName} /> : null}
          {post.costCenterCode ? <TagChip icon="tag-outline" label={post.costCenterCode} /> : null}
        </View>

        <View style={[styles.details, { backgroundColor: c.surfaceCard, borderColor: c.cardBorder }]}>
          {rows.map((row, index) => (
            <View key={row.label} style={[styles.row, index < rows.length - 1 && { borderBottomColor: c.cardBorder, borderBottomWidth: 1 }]}>
              <Text style={[type.labelMd, { color: c.onSurfaceVariant }]}>{row.label}</Text>
              <Text style={[type.bodySm, styles.rowValue, { color: c.onSurface }]} numberOfLines={2}>
                {row.value}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getStyles(c: CaptureColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.surface },
    pad: { padding: 16 },
    content: { padding: 16, gap: 14, paddingBottom: 32 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
    author: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
    authorText: { flex: 1, gap: 1 },
    notice: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 12 },
    linked: { flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 12, paddingRight: 4, minHeight: 48, borderRadius: 12 },
    tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    details: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 16 },
    row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 48, paddingVertical: 8 },
    rowValue: { flexShrink: 1, textAlign: "right" },
  });
}
