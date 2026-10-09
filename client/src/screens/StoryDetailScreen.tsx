import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { AvatarInitials, Badge, EmptyState, HeroMedia, TextButton } from "../components/capture";
import type { EventItem } from "../types/app";
import { useCaptureTheme, type CaptureColors } from "../theme/useCaptureTheme";
import { authorName, formatEventDate, placeOf, reviewStatusOf, reviewStatusPresentation } from "../utils/eventPresenters";

type Props = {
  story: EventItem | null;
  onOpenParent?: (eventId: string) => void;
};

/** Inner layout of a story: banner with the title, author line, and the full narrative. */
export function StoryDetailScreen({ story, onOpenParent }: Props) {
  const { c, type } = useCaptureTheme();
  const styles = useMemo(() => getStyles(c), [c]);

  if (!story) {
    return (
      <SafeAreaView style={styles.safe} edges={[]}>
        <View style={styles.pad}>
          <EmptyState icon="book-off-outline" title="Story not found" message="It may have been removed." />
        </View>
      </SafeAreaView>
    );
  }

  const review = reviewStatusPresentation(reviewStatusOf(story));
  const role = story.uploadedByRole ? story.uploadedByRole.charAt(0).toUpperCase() + story.uploadedByRole.slice(1) : null;
  const paragraphs = (story.body || story.caption || "").split(/\n{2,}/).filter(Boolean);

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <HeroMedia uri={story.mediaUrl} height={260} badge={{ icon: "book-open-page-variant", label: "Deep Story", iconColor: c.brandSun }}>
          <Text style={[type.headlineMd, styles.heroTitle]} numberOfLines={3}>
            {story.title || "Untitled story"}
          </Text>
        </HeroMedia>

        <View style={styles.section}>
          <View style={styles.authorRow}>
            <AvatarInitials name={authorName(story)} size={28} tone="secondary" />
            <Text style={[type.labelMd, { color: c.onSurfaceVariant, flex: 1 }]} numberOfLines={1}>
              {role ? `${authorName(story)} • ${role}` : authorName(story)}
            </Text>
            <Badge label={review.label} tone={review.tone} pill />
          </View>
          <View style={styles.metaRow}>
            <MaterialCommunityIcons name="calendar-today" size={13} color={c.onSurfaceVariant} />
            <Text style={[type.labelSm, { color: c.onSurfaceVariant }]} numberOfLines={1}>
              {formatEventDate(story.eventDate)}
              {placeOf(story) ? ` • ${placeOf(story)}` : ""}
            </Text>
          </View>

          {story.body && story.caption ? (
            <Text style={[type.bodyMd, styles.excerpt, { color: c.onSurfaceVariant }]}>{"“"}{story.caption}{"”"}</Text>
          ) : null}
          {paragraphs.map((paragraph, index) => (
            <Text key={index} style={[type.bodyLg, styles.paragraph, { color: c.onSurface }]}>
              {paragraph}
            </Text>
          ))}

          {story.parentEventId ? (
            <View style={[styles.linked, { backgroundColor: c.surfaceContainerLow }]}>
              <MaterialCommunityIcons name="link-variant" size={16} color={c.tertiary} />
              <Text style={[type.labelMd, { color: c.onSurface, flex: 1 }]} numberOfLines={1}>
                From {story.parentTitle || "an event"}
              </Text>
              {onOpenParent ? <TextButton label="View Hub" onPress={() => onOpenParent(story.parentEventId as string)} /> : null}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getStyles(c: CaptureColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.surface },
    pad: { padding: 16 },
    content: { paddingBottom: 32, gap: 16 },
    heroTitle: { color: "#fff" },
    section: { paddingHorizontal: 16, gap: 12 },
    authorRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    metaRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    excerpt: { fontStyle: "italic", lineHeight: 22 },
    paragraph: { lineHeight: 26 },
    linked: { flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 12, paddingRight: 4, minHeight: 48, borderRadius: 12, marginTop: 4 },
  });
}
