import { useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ContentCard,
  EmptyState,
  FilterSheet,
  IconButton,
  PillTabs,
  SearchField,
} from "../components/capture";
import type { City, EventItem } from "../types/app";
import { useCaptureTheme, type CaptureColors } from "../theme/useCaptureTheme";
import { contentKindOf } from "../utils/eventPresenters";

type ContentType = "all" | "event" | "post" | "story";

const TYPE_TABS: { id: ContentType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "event", label: "Events" },
  { id: "post", label: "Posts" },
  { id: "story", label: "Stories" },
];

const SEARCH_HINTS = [
  "Search by title",
  "Search by teacher",
  "Search by cost center",
  "Search by city",
  "Search by tag",
];

function contentTypeOf(event: EventItem): Exclude<ContentType, "all"> {
  return contentKindOf(event);
}

type Props = {
  events: EventItem[];
  userId: string;
  cities: City[];
  onOpenEvent?: (event: EventItem) => void;
};

/** Feed: every event, post and story, searchable with city and "mine" filters. */
export function FeedScreen({ events, userId, cities, onOpenEvent }: Props) {
  const { c } = useCaptureTheme();
  const styles = useMemo(() => getStyles(c), [c]);
  const [query, setQuery] = useState("");
  const [contentType, setContentType] = useState<ContentType>("all");
  const [cityId, setCityId] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const counts = useMemo(() => {
    const base: Record<ContentType, number> = {
      all: events.length,
      event: 0,
      post: 0,
      story: 0,
    };
    for (const event of events) base[contentTypeOf(event)] += 1;
    return base;
  }, [events]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events
      .filter((event) => {
        if (contentType !== "all" && contentTypeOf(event) !== contentType)
          return false;
        if (cityId && event.cityId !== cityId) return false;
        if (mineOnly && event.uploadedBy !== userId) return false;
        if (!q) return true;
        return [
          event.title,
          event.caption,
          event.uploadedByName,
          event.costCenterCode,
          event.costCenterName,
          event.cityName,
        ].some((value) => (value || "").toLowerCase().includes(q));
      })
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }, [events, contentType, cityId, mineOnly, userId, query]);

  const filtersActive = Boolean(cityId || mineOnly);

  function clearFilters() {
    setCityId("");
    setMineOnly(false);
  }

  function resetAll() {
    setQuery("");
    setContentType("all");
    clearFilters();
  }

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <FlatList
        data={visible}
        keyExtractor={(event) => event.id}
        renderItem={({ item }) => (
          <ContentCard
            item={item}
            onPress={onOpenEvent ? () => onOpenEvent(item) : undefined}
          />
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.searchRow}>
              <View style={styles.searchGrow}>
                <SearchField
                  value={query}
                  onChangeText={setQuery}
                  placeholders={SEARCH_HINTS}
                  size="md"
                  elevated
                />
              </View>
              <IconButton
                icon="tune-variant"
                onPress={() => setFiltersOpen(true)}
                badge={filtersActive}
                elevated
                accessibilityLabel="Filters"
              />
            </View>

            <PillTabs
              tabs={TYPE_TABS.map((tab) => ({ ...tab, count: counts[tab.id] }))}
              activeId={contentType}
              onSelect={(id) => setContentType(id as ContentType)}
              variant="inverse"
              size="md"
            />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            title="No matching entries found"
            message="Try relaxing your search terms or resetting city and content type filters."
            actionLabel="Reset Filters"
            actionIcon="restart"
            onAction={resetAll}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.gap} />}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={7}
        removeClippedSubviews
      />

      <FilterSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        onReset={clearFilters}
        sections={[
          {
            id: "city",
            title: "City",
            allLabel: "All cities",
            options: cities.map((city) => ({ id: city.id, label: city.name })),
            valueId: cityId,
            onChange: setCityId,
          },
        ]}
        toggles={[
          {
            id: "mine",
            label: "Only my uploads",
            value: mineOnly,
            onChange: setMineOnly,
          },
        ]}
      />
    </SafeAreaView>
  );
}

function getStyles(c: CaptureColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.surface },
    content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
    header: { gap: 12, paddingBottom: 12 },
    gap: { height: 16 },
    searchRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    searchGrow: { flex: 1 },
  });
}
