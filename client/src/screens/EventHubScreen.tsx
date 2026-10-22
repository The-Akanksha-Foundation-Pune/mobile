import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { Badge, HeroMedia, ListLoader, PillTabs, PostMasonryGrid, StoryCard, type MasonryPost, popupAlert } from "../components/capture";
import { fetchEventDetail } from "../services/api";
import type { ContentKind, EventDetail, EventItem } from "../types/app";
import { useCaptureTheme, useContentWidth, type CaptureColors } from "../theme/useCaptureTheme";
import { authorName, eventStatusPresentation, formatEventDate } from "../utils/eventPresenters";

type HubTab = "posts" | "stories";

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

function roleLabel(role?: string) {
  return role ? role.charAt(0).toUpperCase() + role.slice(1) : undefined;
}

function nounFor(tab: HubTab, count: number) {
  if (tab === "posts") return count === 1 ? "post" : "posts";
  return count === 1 ? "story" : "stories";
}

/** Event page: photo, details, then the approved posts (gallery) and stories (cards). Same for every role. */
export function EventHubScreen({ token, eventId, initial = null, refreshKey = 0, onOpenPost, onOpenStory, onContribute }: Props) {
  const { c, type } = useCaptureTheme();
  const { isTablet } = useContentWidth();
  const styles = useMemo(() => getStyles(c), [c]);
  const [detail, setDetail] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<HubTab>("posts");
  const [descriptionOpen, setDescriptionOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDetail(await fetchEventDetail(token, eventId));
    } catch (error) {
      popupAlert("Could not load the event", (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token, eventId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const event = detail?.event ?? initial;
  const posts = detail?.posts ?? [];
  const stories = detail?.stories ?? [];
  const remaining = detail?.remaining;

  const masonryPosts = useMemo<MasonryPost[]>(
    () => posts.map((post) => ({ id: post.id, uri: post.mediaUrl, kind: post.mediaType, caption: post.caption, authorName: authorName(post) })),
    [posts]
  );

  if (!event) {
    return (
      <SafeAreaView style={styles.safe} edges={[]}>
        {loading ? <ListLoader message="Loading event..." /> : <Text style={styles.empty}>Event not found.</Text>}
      </SafeAreaView>
    );
  }

  const status = eventStatusPresentation(event.eventStatus);
  const notLive = event.eventStatus !== "ongoing";
  const addKind: Exclude<ContentKind, "event"> = tab === "posts" ? "post" : "story";
  const remainingForTab = remaining ? (tab === "posts" ? remaining.posts : remaining.stories) : null;
  const limitForTab = detail?.limits ? (tab === "posts" ? detail.limits.posts : detail.limits.stories) : null;
  const hasBudget = remainingForTab !== null && remainingForTab !== undefined && limitForTab !== null;
  const budgetUsedUp = hasBudget && (remainingForTab as number) <= 0;

  function handleAdd() {
    if (!onContribute || !event) return;
    if (budgetUsedUp) {
      popupAlert("Limit reached", `You've used your ${limitForTab} ${nounFor(tab, limitForTab as number)} for this event.`);
      return;
    }
    onContribute(addKind, event);
  }

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <HeroMedia uri={event.mediaUrl} height={210} radius={16} badge={{ icon: "calendar-month", label: "Event" }}>
            <View style={styles.photoFoot}>
              <Badge label={status.label} tone={status.tone} pill />
            </View>
          </HeroMedia>

          <Text style={[type.headlineLg, { color: c.onSurface }]}>{event.title || "Untitled event"}</Text>

          <View style={styles.facts}>
            {[
              {
                icon: "calendar-blank-outline" as const,
                value: event.endDate && event.endDate !== event.eventDate ? `${formatEventDate(event.eventDate)} – ${formatEventDate(event.endDate)}` : formatEventDate(event.eventDate),
                tint: "rgba(2,106,162,0.10)",
                color: c.tertiary,
              },
              {
                icon: "map-marker-outline" as const,
                value: [event.location, event.cityName].filter(Boolean).join(", ") || "Location not set",
                tint: "rgba(217,45,32,0.10)",
                color: c.primary,
              },
            ].map((fact) => (
              <View key={fact.icon} style={styles.fact}>
                <View style={[styles.factIcon, { backgroundColor: fact.tint }]}>
                  <MaterialCommunityIcons name={fact.icon} size={14} color={fact.color} />
                </View>
                <Text style={[type.bodySm, styles.grow, { color: c.onSurface }]} numberOfLines={1}>
                  {fact.value}
                </Text>
              </View>
            ))}
          </View>

          <Text style={[type.bodyMd, styles.caption, { color: c.onSurfaceVariant }]} numberOfLines={descriptionOpen ? undefined : 3}>
            {event.caption}
          </Text>
          {event.caption.length > 140 ? (
            <Pressable onPress={() => setDescriptionOpen((value) => !value)} hitSlop={6} accessibilityRole="button">
              <Text style={[type.labelMd, { color: c.primary }]}>{descriptionOpen ? "Show less" : "Read more"}</Text>
            </Pressable>
          ) : null}
        </View>

        {notLive ? (
          <View style={[styles.section, styles.notice, { backgroundColor: c.surfaceContainerLow }]}>
            <MaterialCommunityIcons name={event.eventStatus === "upcoming" ? "calendar-clock" : "calendar-check"} size={20} color={c.tertiary} />
            <Text style={[type.bodySm, styles.grow, { color: c.onSurfaceVariant }]}>
              {event.eventStatus === "upcoming"
                ? `Posts and stories open on ${formatEventDate(event.eventDate)}.`
                : "This event has ended, so posts and stories are closed."}
            </Text>
          </View>
        ) : null}

        {(posts.length > 0 || stories.length > 0 || !notLive) ? (
          <View style={[styles.section, styles.tabRow]}>
            <View style={styles.grow}>
              <PillTabs
                tabs={[
                  { id: "posts", label: "Posts", count: event.postCount ?? posts.length },
                  { id: "stories", label: "Stories", count: event.storyCount ?? stories.length },
                ]}
                activeId={tab}
                onSelect={(id) => setTab(id as HubTab)}
                variant="inverse"
                size="md"
              />
            </View>
            {onContribute && !notLive ? (
              <Pressable
                onPress={handleAdd}
                accessibilityRole="button"
                accessibilityLabel={addKind === "post" ? "Add a post to this event" : "Capture a story for this event"}
                style={({ pressed }) => [styles.addBtn, { backgroundColor: budgetUsedUp ? c.surfaceContainerHighest : pressed ? c.primaryPressed : c.primaryContainer }]}
              >
                <MaterialCommunityIcons name={addKind === "post" ? "image-plus" : "book-plus-outline"} size={20} color={budgetUsedUp ? c.onSurfaceVariant : c.onPrimary} />
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {tab === "posts" ? (
          <View style={styles.section}>
            {masonryPosts.length === 0 ? (
              loading ? (
                <ListLoader message="Loading posts..." />
              ) : (
                <Text style={[type.bodySm, styles.hint, { color: c.onSurfaceVariant }]}>
                  {notLive ? "No posts were shared for this event." : "No posts yet. Tap + to add the first photo or video."}
                </Text>
              )
            ) : (
              <PostMasonryGrid
                posts={masonryPosts}
                columns={isTablet ? 3 : 2}
                onOpen={
                  onOpenPost
                    ? (tile) => {
                        const post = posts.find((item) => item.id === tile.id);
                        if (post) onOpenPost(post);
                      }
                    : undefined
                }
              />
            )}
          </View>
        ) : (
          <View style={[styles.section, styles.storyList]}>
            {stories.length === 0 ? (
              loading ? (
                <ListLoader message="Loading stories..." />
              ) : (
                <Text style={[type.bodySm, styles.hint, { color: c.onSurfaceVariant }]}>
                  {notLive ? "No stories were shared for this event." : "No stories yet. Tap + to capture the first one."}
                </Text>
              )
            ) : (
              stories.map((story) => (
                <StoryCard
                  key={story.id}
                  title={story.title || "Untitled story"}
                  excerpt={story.caption}
                  imageUri={story.mediaUrl}
                  authorName={authorName(story)}
                  authorRole={roleLabel(story.uploadedByRole)}
                  onPress={onOpenStory ? () => onOpenStory(story) : undefined}
                />
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function getStyles(c: CaptureColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.surface },
    content: { paddingTop: 12, paddingBottom: 32, gap: 16 },
    section: { paddingHorizontal: 16, gap: 12 },
    grow: { flex: 1 },
    photoFoot: { flexDirection: "row", justifyContent: "flex-end" },
    facts: { gap: 6 },
    fact: { flexDirection: "row", alignItems: "center", gap: 8 },
    factIcon: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    caption: { lineHeight: 21 },
    notice: { flexDirection: "row", alignItems: "center", gap: 10, marginHorizontal: 16, paddingVertical: 12, borderRadius: 12 },
    tabRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    addBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
    hint: { paddingVertical: 12 },
    storyList: { gap: 14 },
    empty: { textAlign: "center", marginTop: 48, color: c.onSurfaceVariant, fontFamily: "Inter_400Regular", fontSize: 14 },
  });
}
