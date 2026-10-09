import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ContentCard,
  EmptyState,
  FilterSheet,
  IconButton,
  PillTabs,
  SearchField,
  type SelectOption,
} from "../components/capture";
import type { City, EventItem } from "../types/app";
import { useCaptureTheme, type CaptureColors } from "../theme/useCaptureTheme";
import { contentKindOf, reviewStatusOf } from "../utils/eventPresenters";

type ContentType = "all" | "event" | "post" | "story";

const TYPE_TABS: { id: ContentType; label: string }[] = [
  { id: "all", label: "All" },
  { id: "event", label: "Events" },
  { id: "post", label: "Posts" },
  { id: "story", label: "Stories" },
];

const SEARCH_HINTS = ["Search by title", "Search by teacher", "Search by cost center", "Search by city", "Search by tag"];

const STATUS_OPTIONS: SelectOption[] = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "changes_requested", label: "Changes needed" },
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

/** Feed: every event, post and story, searchable with city, status and "mine" filters. */
export function FeedScreen({ events, userId, cities, onOpenEvent }: Props) {
  const { c } = useCaptureTheme();
  const styles = useMemo(() => getStyles(c), [c]);
  const [query, setQuery] = useState("");
  const [contentType, setContentType] = useState<ContentType>("all");
  const [cityId, setCityId] = useState("");
  const [status, setStatus] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const counts = useMemo(() => {
    const base: Record<ContentType, number> = { all: events.length, event: 0, post: 0, story: 0 };
    for (const event of events) base[contentTypeOf(event)] += 1;
    return base;
  }, [events]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events
      .filter((event) => {
        if (contentType !== "all" && contentTypeOf(event) !== contentType) return false;
        if (cityId && event.cityId !== cityId) return false;
        if (status && reviewStatusOf(event) !== status) return false;
        if (mineOnly && event.uploadedBy !== userId) return false;
        if (!q) return true;
        return [event.title, event.caption, event.uploadedByName, event.costCenterCode, event.costCenterName, event.eventTypeName, event.cityName]
          .some((value) => (value || "").toLowerCase().includes(q));
      })
      .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  }, [events, contentType, cityId, status, mineOnly, userId, query]);

  const filtersActive = Boolean(cityId || status || mineOnly);

  function clearFilters() {
    setCityId("");
    setStatus("");
    setMineOnly(false);
  }

  function resetAll() {
    setQuery("");
    setContentType("all");
    clearFilters();
  }

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.searchRow}>
          <View style={styles.searchGrow}>
            <SearchField value={query} onChangeText={setQuery} placeholders={SEARCH_HINTS} size="md" elevated />
          </View>
          <IconButton icon="tune-variant" onPress={() => setFiltersOpen(true)} badge={filtersActive} elevated accessibilityLabel="Filters" />
        </View>

        <PillTabs
          tabs={TYPE_TABS.map((tab) => ({ ...tab, count: counts[tab.id] }))}
          activeId={contentType}
          onSelect={(id) => setContentType(id as ContentType)}
          variant="inverse"
          size="md"
        />

        {visible.length === 0 ? (
          <EmptyState
            title="No matching entries found"
            message="Try relaxing your search terms or resetting city and content type filters."
            actionLabel="Reset Filters"
            actionIcon="restart"
            onAction={resetAll}
          />
        ) : (
          <View style={styles.list}>
            {visible.map((event) => (
              <ContentCard key={event.id} item={event} onPress={onOpenEvent ? () => onOpenEvent(event) : undefined} />
            ))}
          </View>
        )}
      </ScrollView>

      <FilterSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        onReset={clearFilters}
        sections={[
          { id: "city", title: "City", allLabel: "All cities", options: cities.map((city) => ({ id: city.id, label: city.name })), valueId: cityId, onChange: setCityId },
          { id: "status", title: "Status", allLabel: "Any status", options: STATUS_OPTIONS, valueId: status, onChange: setStatus },
        ]}
        toggles={[{ id: "mine", label: "Only my uploads", value: mineOnly, onChange: setMineOnly }]}
      />
    </SafeAreaView>
  );
}

function getStyles(c: CaptureColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.surface },
    content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32, gap: 12 },
    searchRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    searchGrow: { flex: 1 },
    list: { gap: 16 },
  });
}
