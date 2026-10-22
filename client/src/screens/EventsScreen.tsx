import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Badge,
  BottomSheet,
  CaptureButton,
  ContentCard,
  EmptyState,
  FilterSheet,
  IconButton,
  MonthCalendar,
  PillTabs,
  SearchField,
} from "../components/capture";
import { toDateKey } from "../components/capture/MonthCalendar";
import type { City, EventItem, EventType } from "../types/app";
import { useCaptureTheme, type CaptureColors } from "../theme/useCaptureTheme";
import { contentKindOf, eventStatusPresentation, formatEventDate, placeOf } from "../utils/eventPresenters";

type EventsTab = "all" | "upcoming" | "ongoing" | "calendar";

const SEARCH_HINTS = ["Search by title", "Search by location", "Search by cost center", "Search by city"];

type Props = {
  events: EventItem[];
  cities: City[];
  onOpenEvent: (event: EventItem) => void;
};

const byDateDesc = (a: EventItem, b: EventItem) =>
  b.eventDate.localeCompare(a.eventDate) || (b.createdAt || "").localeCompare(a.createdAt || "");
const byDateAsc = (a: EventItem, b: EventItem) =>
  a.eventDate.localeCompare(b.eventDate) || (a.createdAt || "").localeCompare(b.createdAt || "");

/** Events tab: all / upcoming / ongoing lists and a month calendar, with category and city filters. */
export function EventsScreen({ events, cities, onOpenEvent }: Props) {
  const { c, type, layout } = useCaptureTheme();
  const styles = useMemo(() => getStyles(c), [c]);
  const todayKey = toDateKey(new Date());
  const [tab, setTab] = useState<EventsTab>("all");
  const [query, setQuery] = useState("");
  const [cityId, setCityId] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [month, setMonth] = useState(todayKey.slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(todayKey);
  const [popupDate, setPopupDate] = useState<string | null>(null);

  const allEvents = useMemo(() => events.filter((event) => contentKindOf(event) === "event"), [events]);

  /** Calendar dots: one colour now that events carry no category. */
  const colorOf = (_event: EventItem) => c.primary;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allEvents.filter((event) => {
      if (cityId && event.cityId !== cityId) return false;
      if (!q) return true;
      return [event.title, event.caption, event.location, event.costCenterCode, event.costCenterName, event.cityName]
        .some((value) => (value || "").toLowerCase().includes(q));
    });
  }, [allEvents, cityId, query]);

  const lists = useMemo(
    () => ({
      all: [...filtered].sort(byDateDesc),
      upcoming: filtered.filter((event) => event.eventStatus === "upcoming").sort(byDateAsc),
      ongoing: filtered.filter((event) => event.eventStatus === "ongoing").sort(byDateDesc),
    }),
    [filtered]
  );

  const markers = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const event of filtered) (map[event.eventDate.slice(0, 10)] ??= []).push(colorOf(event));
    return map;
  }, [filtered]);

  const popupEvents = useMemo(
    () => (popupDate ? filtered.filter((event) => event.eventDate.slice(0, 10) === popupDate).sort(byDateAsc) : []),
    [filtered, popupDate]
  );
  const monthCount = useMemo(() => filtered.filter((event) => event.eventDate.startsWith(month)).length, [filtered, month]);

  const tabs = [
    { id: "all", label: "All events", count: lists.all.length },
    { id: "upcoming", label: "Upcoming", count: lists.upcoming.length },
    { id: "ongoing", label: "Live", count: lists.ongoing.length },
    { id: "calendar", label: "Calendar" },
  ];

  function resetFilters() {
    setQuery("");
    setCityId("");
  }

  function goToToday() {
    setMonth(todayKey.slice(0, 7));
    setSelectedDate(todayKey);
  }

  function renderList(list: EventItem[], emptyTitle: string) {
    if (list.length === 0) {
      const filtering = Boolean(query || cityId);
      return (
        <EmptyState
          icon="calendar-blank-outline"
          title={filtering ? "No matching events" : emptyTitle}
          message={filtering ? "Try another city or search term." : undefined}
          actionLabel={filtering ? "Reset Filters" : undefined}
          actionIcon="restart"
          onAction={filtering ? resetFilters : undefined}
        />
      );
    }
    return (
      <View style={styles.list}>
        {list.map((event) => (
          <ContentCard key={event.id} item={event} onPress={() => onOpenEvent(event)} />
        ))}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {tab !== "calendar" ? (
          <View style={styles.searchRow}>
            <View style={styles.searchGrow}>
              <SearchField value={query} onChangeText={setQuery} placeholders={SEARCH_HINTS} size="md" elevated />
            </View>
            <IconButton icon="tune-variant" onPress={() => setFiltersOpen(true)} badge={Boolean(cityId)} elevated accessibilityLabel="Filters" />
          </View>
        ) : null}

        <PillTabs tabs={tabs} activeId={tab} onSelect={(id) => setTab(id as EventsTab)} variant="inverse" size="md" />


        {tab === "all" ? renderList(lists.all, "No events yet") : null}
        {tab === "upcoming" ? renderList(lists.upcoming, "No upcoming events") : null}
        {tab === "ongoing" ? renderList(lists.ongoing, "Nothing happening right now") : null}

        {tab === "calendar" ? (
          <>
            <MonthCalendar
              month={month}
              selectedDate={selectedDate}
              markers={markers}
              onMonthChange={setMonth}
              onSelectDate={setSelectedDate}
              onPressEvents={setPopupDate}
            />
            <View style={styles.dayHeader}>
              <Text style={[type.bodySm, styles.dayHint, { color: c.onSurfaceVariant }]}>
                {monthCount} event{monthCount === 1 ? "" : "s"} this month • tap a dotted date for details
              </Text>
              {month !== todayKey.slice(0, 7) || selectedDate !== todayKey ? (
                <Pressable onPress={goToToday} style={({ pressed }) => [styles.todayBtn, { borderRadius: layout.radius.full, backgroundColor: pressed ? c.surfaceContainer : c.surfaceContainerLow }]}>
                  <Text style={[type.labelMd, { color: c.primary }]}>Today</Text>
                </Pressable>
              ) : null}
            </View>
          </>
        ) : null}
      </ScrollView>

      <BottomSheet
        visible={popupDate !== null}
        onClose={() => setPopupDate(null)}
        title={popupDate ? formatEventDate(popupDate) : ""}
        subtitle={`${popupEvents.length} event${popupEvents.length === 1 ? "" : "s"}`}
      >
        <View style={styles.popupList}>
          {popupEvents.map((event) => {
            const status = eventStatusPresentation(event.eventStatus);
            const place = placeOf(event);
            return (
              <View key={event.id} style={[styles.popupItem, { backgroundColor: c.surfaceContainerLow, borderRadius: layout.radius.md }]}>
                <View style={styles.popupTop}>
                  <Badge label={status.label} tone={status.tone === "info" ? "info" : status.tone === "success" ? "success" : "warning"} pill />
                </View>
                <Text style={[type.headlineSm, { color: c.onSurface }]} numberOfLines={2}>
                  {event.title || "Untitled event"}
                </Text>
                {place || event.cityName ? (
                  <Text style={[type.bodySm, { color: c.onSurfaceVariant }]} numberOfLines={1}>
                    {[place, event.cityName].filter((value, index, all) => value && all.indexOf(value) === index).join(" • ")}
                  </Text>
                ) : null}
                {event.caption ? (
                  <Text style={[type.bodyMd, { color: c.onSurface }]} numberOfLines={3}>
                    {event.caption}
                  </Text>
                ) : null}
                <CaptureButton
                  label="View details"
                  icon="arrow-right"
                  size="sm"
                  variant="tonal"
                  onPress={() => {
                    setPopupDate(null);
                    onOpenEvent(event);
                  }}
                />
              </View>
            );
          })}
        </View>
      </BottomSheet>

      <FilterSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        onReset={() => setCityId("")}
        sections={[
          { id: "city", title: "City", allLabel: "All cities", options: cities.map((city) => ({ id: city.id, label: city.name })), valueId: cityId, onChange: setCityId },
        ]}
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
    chip: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 36, paddingHorizontal: 14, borderWidth: 1 },
    chipDot: { width: 8, height: 8, borderRadius: 4 },
    list: { gap: 16 },
    dayHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 4 },
    dayHint: { flex: 1 },
    popupList: { gap: 12, paddingBottom: 8 },
    popupItem: { padding: 14, gap: 6 },
    popupTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    popupCategory: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 },
    todayBtn: { paddingHorizontal: 14, minHeight: 36, justifyContent: "center" },
  });
}
