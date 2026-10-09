import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Badge, CaptureButton, HeroMedia, PillTabs, PostCard, StoryCard, TagChip } from "../components/capture";
import { fetchEventDetail } from "../services/api";
import type { ContentKind, EventDetail, EventItem } from "../types/app";
import { useCaptureTheme, type CaptureColors } from "../theme/useCaptureTheme";
import {
  authorName,
  eventStatusPresentation,
  formatEventDate,
  placeOf,
  reviewStatusOf,
  reviewStatusPresentation,
} from "../utils/eventPresenters";
import { formatRelativeTime } from "../utils/relativeTime";

type Props = {
  token: string;
  eventId: string;
  /** Record already in memory, shown while the full detail loads. */
  initial?: EventItem | null;
  /** Bump to reload, e.g. after a post is added. */
  refreshKey?: number;
  onOpenPost?: (post: EventItem) => void;
  onOpenStory?: (story: EventItem) => void;
  onContribute?: (kind: Exclude<ContentKind, "event">, parent: EventItem) => void;
};

/** Inner layout of an event: banner, details, and the posts and stories attached to it. */
export function EventHubScreen({ token, eventId, initial = null, refreshKey = 0, onOpenPost, onOpenStory, onContribute }: Props) {
  const { c, type } = useCaptureTheme();
  const styles = useMemo(() => getStyles(c), [c]);
  const [detail, setDetail] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"post" | "story">("post");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDetail(await fetchEventDetail(token, eventId));
    } catch (error) {
      Alert.alert("Could not load the event", (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token, eventId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const event = detail?.event ?? initial;
  if (!event) {
    return (
      <SafeAreaView style={styles.safe} edges={[]}>
        <Text style={styles.empty}>{loading ? "Loading event..." : "Event not found."}</Text>
      </SafeAreaView>
    );
  }

  const posts = detail?.posts ?? [];
  const stories = detail?.stories ?? [];
  const status = eventStatusPresentation(event.eventStatus);
  const review = reviewStatusPresentation(reviewStatusOf(event));
  const when = placeOf(event) ? `${formatEventDate(event.eventDate)} • ${placeOf(event)}` : formatEventDate(event.eventDate);

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <HeroMedia uri={event.mediaUrl} height={220} badge={{ icon: "calendar-month", label: "Event" }}>
          <View style={styles.whenRow}>
            <MaterialCommunityIcons name="clock-outline" size={13} color="#dbe2f9" />
            <Text style={[type.labelSm, styles.whenText]} numberOfLines={1}>
              {when}
            </Text>
          </View>
        </HeroMedia>

        <View style={styles.section}>
          <Text style={[type.headlineMd, { color: c.onSurface }]}>{event.title || "Untitled event"}</Text>
          <View style={styles.badges}>
            <Badge label={status.label} tone={status.tone} pill />
            <Badge label={review.label} tone={review.tone} pill />
          </View>
          <View style={styles.tags}>
            {event.eventTypeName ? <TagChip icon="shape-outline" label={event.eventTypeName} /> : null}
            {event.cityName ? <TagChip icon="map-marker-outline" label={event.cityName} /> : null}
            {event.costCenterCode ? <TagChip icon="tag-outline" label={event.costCenterCode} /> : null}
          </View>
          <Text style={[type.bodyMd, { color: c.onSurface }]}>{event.caption}</Text>
          <Text style={[type.bodySm, { color: c.onSurfaceVariant }]}>
            Added by {authorName(event)} • {formatRelativeTime(event.createdAt)}
          </Text>
          {onContribute ? (
            <View style={styles.actions}>
              <CaptureButton label="Contribute a post" icon="image-plus" onPress={() => onContribute("post", event)} style={styles.actionBtn} />
              <CaptureButton label="Capture a story" variant="secondary" icon="book-open-page-variant" onPress={() => onContribute("story", event)} style={styles.actionBtn} />
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <PillTabs
            tabs={[
              { id: "post", label: "Posts", count: posts.length },
              { id: "story", label: "Stories", count: stories.length },
            ]}
            activeId={tab}
            onSelect={(id) => setTab(id as "post" | "story")}
            size="md"
          />
          {tab === "post" ? (
            posts.length === 0 ? (
              <Text style={[type.bodySm, { color: c.onSurfaceVariant }]}>{loading ? "Loading..." : "No posts yet. Be the first to contribute."}</Text>
            ) : (
              posts.map((post) => {
                const postReview = reviewStatusPresentation(reviewStatusOf(post));
                return (
                  <PostCard
                    key={post.id}
                    authorName={authorName(post)}
                    authorMeta={`${placeOf(post) || event.cityName || ""} • ${formatRelativeTime(post.createdAt)}`}
                    typeLabel="Post"
                    caption={post.caption}
                    media={{ kind: post.mediaType, uri: post.mediaUrl }}
                    status={postReview}
                    onPress={onOpenPost ? () => onOpenPost(post) : undefined}
                  />
                );
              })
            )
          ) : stories.length === 0 ? (
            <Text style={[type.bodySm, { color: c.onSurfaceVariant }]}>{loading ? "Loading..." : "No stories yet."}</Text>
          ) : (
            stories.map((story) => (
              <StoryCard
                key={story.id}
                title={story.title || "Untitled story"}
                excerpt={story.caption}
                imageUri={story.mediaUrl}
                authorName={authorName(story)}
                authorRole={story.uploadedByRole ? story.uploadedByRole.charAt(0).toUpperCase() + story.uploadedByRole.slice(1) : undefined}
                onPress={onOpenStory ? () => onOpenStory(story) : undefined}
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function getStyles(c: CaptureColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.surface },
    content: { paddingBottom: 32, gap: 20 },
    section: { paddingHorizontal: 16, gap: 10 },
    whenRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    whenText: { color: "#dbe2f9", flexShrink: 1 },
    badges: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    tags: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
    actions: { gap: 10, marginTop: 4 },
    actionBtn: { alignSelf: "stretch" },
    empty: { textAlign: "center", marginTop: 48, color: c.onSurfaceVariant, fontFamily: "Inter_400Regular", fontSize: 14 },
  });
}
