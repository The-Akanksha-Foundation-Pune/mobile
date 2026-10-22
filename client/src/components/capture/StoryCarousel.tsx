import { useRef, useState } from "react";
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AvatarInitials } from "./AvatarInitials";
import { useCaptureTheme, useContentWidth } from "../../theme/useCaptureTheme";
import { RemoteImage } from "./RemoteImage";

export type StoryCover = {
  id: string;
  title: string;
  excerpt?: string;
  uri?: string;
  authorName: string;
  authorRole?: string;
  dateLabel?: string;
};

type CardProps = { story: StoryCover; width: number; onPress?: () => void };

/** Tall magazine-style cover: image, scrim, title, excerpt and author. */
export function StoryCoverCard({ story, width, onPress }: CardProps) {
  const { c, type, layout, shadow } = useCaptureTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`Read story ${story.title}`}
      style={({ pressed }) => [styles.card, shadow.level2, { width, borderRadius: layout.radius.lg, backgroundColor: c.surfaceContainer, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
    >
      <RemoteImage uri={story.uri} fallbackIcon="book-open-page-variant" fallbackIconSize={36} />
      <View style={styles.scrim} pointerEvents="none">
        <View style={styles.band1} />
        <View style={styles.band2} />
        <View style={styles.band3} />
      </View>
      <View style={styles.badge}>
        <MaterialCommunityIcons name="book-open-page-variant" size={12} color={c.brandSun} />
        <Text style={styles.badgeText}>STORY</Text>
      </View>
      <View style={styles.body}>
        <Text style={[type.headlineMd, styles.title]} numberOfLines={3}>
          {story.title}
        </Text>
        {story.excerpt ? (
          <Text style={[type.bodySm, styles.excerpt]} numberOfLines={2}>
            {story.excerpt}
          </Text>
        ) : null}
        <View style={styles.authorRow}>
          <AvatarInitials name={story.authorName} size={24} tone="secondary" />
          <Text style={[type.labelSm, styles.author]} numberOfLines={1}>
            {story.authorRole ? `${story.authorName} • ${story.authorRole}` : story.authorName}
            {story.dateLabel ? ` • ${story.dateLabel}` : ""}
          </Text>
          <View style={[styles.readPill, { backgroundColor: c.primary }]}>
            <Text style={[type.labelSm, { color: c.onPrimary }]}>Read</Text>
            <MaterialCommunityIcons name="arrow-right" size={12} color={c.onPrimary} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

type CarouselProps = { stories: StoryCover[]; onOpen?: (story: StoryCover) => void; sidePadding?: number };

/** Horizontal, snapping row of story covers with page dots. */
export function StoryCarousel({ stories, onOpen, sidePadding = 16 }: CarouselProps) {
  const { c } = useCaptureTheme();
  const { contentWidth: screenWidth } = useContentWidth();
  const [page, setPage] = useState(0);
  const gap = 12;
  const cardWidth = Math.round((screenWidth - sidePadding * 2) * 0.82);
  const interval = cardWidth + gap;
  const scrollRef = useRef<ScrollView>(null);

  function onScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(event.nativeEvent.contentOffset.x / interval);
    if (next !== page) setPage(Math.max(0, Math.min(stories.length - 1, next)));
  }

  return (
    <View style={styles.carousel}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={interval}
        decelerationRate="fast"
        onScroll={onScroll}
        scrollEventThrottle={32}
        contentContainerStyle={{ paddingHorizontal: sidePadding, gap }}
      >
        {stories.map((story) => (
          <StoryCoverCard key={story.id} story={story} width={cardWidth} onPress={onOpen ? () => onOpen(story) : undefined} />
        ))}
      </ScrollView>
      {stories.length > 1 ? (
        <View style={styles.dots}>
          {stories.map((story, index) => (
            <View key={story.id} style={[styles.dot, { backgroundColor: index === page ? c.primary : c.surfaceContainerHighest, width: index === page ? 18 : 6 }]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  carousel: { gap: 10 },
  card: { aspectRatio: 3 / 4, overflow: "hidden" },
  scrim: { position: "absolute", left: 0, right: 0, bottom: 0, height: "75%" },
  band1: { flex: 1, backgroundColor: "rgba(11,15,25,0.08)" },
  band2: { flex: 1, backgroundColor: "rgba(11,15,25,0.42)" },
  band3: { flex: 1.4, backgroundColor: "rgba(11,15,25,0.82)" },
  badge: { position: "absolute", top: 12, left: 12, flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: "rgba(11,15,25,0.7)" },
  badgeText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 10, letterSpacing: 0.8 },
  body: { position: "absolute", left: 14, right: 14, bottom: 14, gap: 8 },
  title: { color: "#fff" },
  excerpt: { color: "rgba(255,255,255,0.85)" },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  author: { color: "#dbe2f9", flex: 1 },
  readPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
  dots: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 5 },
  dot: { height: 6, borderRadius: 3 },
});
