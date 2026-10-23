import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ContentCard, EmptyState, PillTabs } from "../components/capture";
import type { EventItem } from "../types/app";
import { useCaptureTheme, type CaptureColors } from "../theme/useCaptureTheme";
import { contentKindOf } from "../utils/eventPresenters";

type ContentType = "all" | "event" | "post" | "story";

const TYPE_TABS: { id: ContentType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "event", label: "Events" },
  { id: "post", label: "Posts" },
  { id: "story", label: "Stories" },
];

const WINDOW_DAYS = 30;

type Props = {
  events: EventItem[];
  userId: string;
  onOpenEvent?: (event: EventItem) => void;
  onCreate?: () => void;
};

/** My activity: everything the signed-in user has uploaded in the last 30 days. */
export function ActivityScreen({ events, userId, onOpenEvent, onCreate }: Props) {
  const { c, type } = useCaptureTheme();
  const styles = useMemo(() => getStyles(c), [c]);
  const [contentType, setContentType] = useState<ContentType>("all");

  const mine = useMemo(() => {
    const since = Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000;
    return events
      .filter((event) => event.uploadedBy === userId && new Date(event.createdAt).getTime() >= since)
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }, [events, userId]);

  const counts = useMemo(() => {
    const base: Record<ContentType, number> = { all: mine.length, event: 0, post: 0, story: 0 };
    for (const event of mine) base[contentKindOf(event)] += 1;
    return base;
  }, [mine]);

  const visible = contentType === "all" ? mine : mine.filter((event) => contentKindOf(event) === contentType);

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[type.bodySm, { color: c.onSurfaceVariant }]}>Your uploads from the last {WINDOW_DAYS} days</Text>

        <PillTabs
          tabs={TYPE_TABS.map((tab) => ({ ...tab, count: counts[tab.id] }))}
          activeId={contentType}
          onSelect={(id) => setContentType(id as ContentType)}
          variant="inverse"
          size="md"
        />

        {visible.length === 0 ? (
          <EmptyState
            icon="history"
            title="Nothing here yet"
            message={
              mine.length === 0
                ? `You haven't shared anything in the last ${WINDOW_DAYS} days.`
                : "No uploads of this type in the last month."
            }
            actionLabel={mine.length === 0 && onCreate ? "Capture something" : undefined}
            actionIcon="plus"
            onAction={onCreate}
          />
        ) : (
          <View style={styles.list}>
            {visible.map((event) => (
              <ContentCard key={event.id} item={event} onPress={onOpenEvent ? () => onOpenEvent(event) : undefined} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function getStyles(c: CaptureColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.surface },
    content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32, gap: 12 },
    list: { gap: 16 },
  });
}
