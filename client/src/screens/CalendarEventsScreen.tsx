import { useCallback, useEffect, useMemo, useState } from "react";
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Badge, BottomSheet, BulkActionDock, CaptureButton, Checkbox, EmptyState, ListLoader, PillTabs, TextButton, popupAlert, type PillTab } from "../components/capture";
import { CalendarDisconnectedError, fetchGoogleCalendarEvents, importGoogleCalendarEvents } from "../services/api";
import type { CalendarImportResult, City, CostCenter, GoogleCalendarEvent, GoogleCalendarEventsPage } from "../types/app";
import { useCaptureTheme, type CaptureColors } from "../theme/useCaptureTheme";

type RangeId = "14" | "30" | "90";

const RANGE_TABS: PillTab[] = [
  { id: "14", label: "2 weeks" },
  { id: "30", label: "1 month" },
  { id: "90", label: "3 months" },
];

const DAY_MS = 24 * 60 * 60 * 1000;
/** Matches the backend's per-request limit. */
const MAX_IMPORT = 50;

export type ImportArgs = { eventIds: string[]; costCenterId: string; cityId: string | null };

type Props = {
  token: string;
  cities: City[];
  costCenters: CostCenter[];
  /** Pre-selected cost center in the import sheet, normally the user's own. */
  defaultCostCenterId?: string | null;
  /** Shown when the backend says the link is gone; takes the user back to connect again. */
  onReconnect: () => void;
  /** Called after at least one event was imported so the app's event list can refresh. */
  onImported?: () => void;
  /** Dev/preview overrides for the data source. */
  loadEvents?: (range: { from: Date; to: Date }) => Promise<GoogleCalendarEventsPage>;
  importEvents?: (args: ImportArgs) => Promise<CalendarImportResult>;
};

type LoadState =
  | { status: "loading" }
  | { status: "ready"; page: GoogleCalendarEventsPage }
  | { status: "disconnected"; message: string }
  | { status: "error"; message: string };

/** All-day events carry a bare YYYY-MM-DD; parse it as a local date so it does not shift a day. */
function parseStart(event: GoogleCalendarEvent): Date | null {
  if (!event.start) return null;
  const date = event.allDay ? new Date(`${event.start}T00:00:00`) : new Date(event.start);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function dayHeading(key: string): string {
  const date = new Date(`${key}T00:00:00`);
  const today = new Date();
  const diffDays = Math.round((new Date(dayKey(date)).getTime() - new Date(dayKey(today)).getTime()) / DAY_MS);
  const label = date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
  if (diffDays === 0) return `Today • ${label}`;
  if (diffDays === 1) return `Tomorrow • ${label}`;
  return label;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** "All day", "10:00 AM – 11:30 AM", or "3 Nov – 5 Nov" for multi-day all-day events. */
function timeLabel(event: GoogleCalendarEvent): string {
  if (event.allDay) {
    if (event.start && event.end) {
      const start = new Date(`${event.start}T00:00:00`);
      // Google's all-day end date is exclusive, so subtract a day for the last day shown.
      const end = new Date(new Date(`${event.end}T00:00:00`).getTime() - DAY_MS);
      if (end.getTime() > start.getTime()) {
        const fmt = (d: Date) => d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
        return `${fmt(start)} – ${fmt(end)}`;
      }
    }
    return "All day";
  }
  if (!event.start) return "";
  return event.end ? `${formatTime(event.start)} – ${formatTime(event.end)}` : formatTime(event.start);
}

function describeImport(result: CalendarImportResult): { title: string; message: string } {
  const already = result.skipped.filter((item) => item.reason === "already_imported").length;
  const missing = result.skipped.length - already;
  const parts: string[] = [];
  if (result.importedCount > 0) parts.push(`${result.importedCount} ${result.importedCount === 1 ? "event" : "events"} added to the app.`);
  if (already > 0) parts.push(`${already} ${already === 1 ? "was" : "were"} already imported.`);
  if (missing > 0) parts.push(`${missing} could not be read from Google Calendar.`);
  return {
    title: result.importedCount > 0 ? "Events imported" : "Nothing imported",
    message: parts.join(" ") || "No events were imported.",
  };
}

/** Preview of upcoming events pulled live from the user's connected Google Calendar, with import. */
export function CalendarEventsScreen({ token, cities, costCenters, defaultCostCenterId, onReconnect, onImported, loadEvents, importEvents }: Props) {
  const { c, type, layout, shadow } = useCaptureTheme();
  const styles = useMemo(() => getStyles(c), [c]);
  const [range, setRange] = useState<RangeId>("30");
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [costCenterId, setCostCenterId] = useState<string | null>(defaultCostCenterId ?? null);
  const [importing, setImporting] = useState(false);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setState({ status: "loading" });
      const from = new Date();
      const to = new Date(from.getTime() + Number(range) * DAY_MS);
      try {
        const page = loadEvents ? await loadEvents({ from, to }) : await fetchGoogleCalendarEvents(token, { from, to, max: 100 });
        setState({ status: "ready", page });
      } catch (error) {
        if (error instanceof CalendarDisconnectedError) {
          setState({ status: "disconnected", message: error.message });
        } else {
          setState({ status: "error", message: (error as Error).message });
        }
      }
    },
    [token, range, loadEvents]
  );

  useEffect(() => {
    void load();
  }, [load]);

  // Selection only makes sense for the events on screen; drop ids that are gone or now imported.
  useEffect(() => {
    if (state.status !== "ready") return;
    const selectable = new Set(state.page.events.filter((event) => !event.importedEventId).map((event) => event.id));
    setSelected((prev) => {
      const next = new Set([...prev].filter((id) => selectable.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [state]);

  async function onRefresh() {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }

  const groups = useMemo(() => {
    if (state.status !== "ready") return [];
    const byDay = new Map<string, GoogleCalendarEvent[]>();
    for (const event of state.page.events) {
      const start = parseStart(event);
      if (!start) continue;
      const key = dayKey(start);
      byDay.set(key, [...(byDay.get(key) ?? []), event]);
    }
    return [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [state]);

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) {
        if (next.size >= MAX_IMPORT) {
          popupAlert("Selection limit", `You can import up to ${MAX_IMPORT} events at a time.`);
          return prev;
        }
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  function toggleDay(items: GoogleCalendarEvent[]) {
    const ids = items.filter((event) => !event.importedEventId).map((event) => event.id);
    const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      if (next.size > MAX_IMPORT) {
        popupAlert("Selection limit", `You can import up to ${MAX_IMPORT} events at a time.`);
        return prev;
      }
      return next;
    });
  }

  const chosenCostCenter = costCenters.find((center) => center.id === costCenterId) ?? null;
  const cityNameOf = (center: CostCenter) => cities.find((city) => city.id === center.cityId)?.name || center.cityName || "";

  async function runImport() {
    if (!chosenCostCenter) {
      popupAlert("Choose a cost center", "Imported events need a cost center so they show up for the right centre.");
      return;
    }
    const eventIds = [...selected];
    const args: ImportArgs = { eventIds, costCenterId: chosenCostCenter.id, cityId: chosenCostCenter.cityId ?? null };
    setImporting(true);
    try {
      const result = importEvents ? await importEvents(args) : await importGoogleCalendarEvents(token, args);
      setSheetOpen(false);
      setSelected(new Set());
      const { title, message } = describeImport(result);
      popupAlert(title, message);
      if (result.importedCount > 0) onImported?.();
      await load(true);
    } catch (error) {
      if (error instanceof CalendarDisconnectedError) {
        setSheetOpen(false);
        setState({ status: "disconnected", message: error.message });
      } else {
        popupAlert("Import failed", (error as Error).message);
      }
    } finally {
      setImporting(false);
    }
  }

  const card = [styles.card, shadow.level1, { borderRadius: layout.radius.lg }];
  const importedCount = state.status === "ready" ? state.page.events.filter((event) => event.importedEventId).length : 0;

  let body: React.ReactNode;
  if (state.status === "loading") {
    body = <ListLoader message="Fetching events from Google Calendar..." />;
  } else if (state.status === "disconnected") {
    body = (
      <EmptyState
        icon="calendar-remove-outline"
        title="Calendar not connected"
        message={state.message}
        actionLabel="Connect again"
        actionIcon="calendar-sync"
        onAction={onReconnect}
      />
    );
  } else if (state.status === "error") {
    body = <EmptyState icon="alert-circle-outline" title="Could not load events" message={state.message} actionLabel="Try again" actionIcon="refresh" onAction={() => void load()} />;
  } else if (groups.length === 0) {
    body = <EmptyState icon="calendar-blank-outline" title="No upcoming events" message={`Nothing is scheduled in ${state.page.calendarName} for this period.`} />;
  } else {
    body = (
      <>
        {groups.map(([key, items]) => {
          const selectableIds = items.filter((event) => !event.importedEventId).map((event) => event.id);
          const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));
          return (
            <View key={key} style={styles.group}>
              <View style={styles.groupHeader}>
                <Text style={[type.labelSm, styles.groupTitle, { color: c.onSurfaceVariant }]}>{dayHeading(key).toUpperCase()}</Text>
                {selectableIds.length > 0 ? (
                  <TextButton label={allSelected ? "Clear day" : "Select day"} icon={null} onPress={() => toggleDay(items)} />
                ) : null}
              </View>
              {items.map((event) => (
                <EventRow key={event.id} event={event} card={card} selected={selected.has(event.id)} onSelect={(next) => toggle(event.id, next)} />
              ))}
            </View>
          );
        })}
      </>
    );
  }

  return (
    <View style={styles.safe}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, selected.size > 0 && styles.contentWithDock]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={c.primary} />}
      >
        <View style={[card, styles.summary]}>
          <View style={[styles.summaryIcon, { backgroundColor: c.tertiaryFixed }]}>
            <MaterialCommunityIcons name="google" size={22} color={c.tertiary} />
          </View>
          <View style={styles.flex}>
            <Text style={[type.labelLg, { color: c.onSurface }]} numberOfLines={1}>
              {state.status === "ready" ? state.page.calendarName : "Google Calendar"}
            </Text>
            <Text style={[type.bodySm, { color: c.onSurfaceVariant }]}>
              {state.status === "ready"
                ? `${state.page.events.length} upcoming ${state.page.events.length === 1 ? "event" : "events"}${importedCount > 0 ? ` • ${importedCount} already imported` : ""}. Tick the ones to add to the app.`
                : "Live preview of your upcoming events"}
            </Text>
          </View>
        </View>
        <PillTabs tabs={RANGE_TABS} activeId={range} onSelect={(id) => setRange(id as RangeId)} size="sm" />
        {body}
      </ScrollView>

      <BulkActionDock count={selected.size} noun="event" actionLabel="Import selected" actionIcon="calendar-import" onAction={() => setSheetOpen(true)} busy={importing} />

      <BottomSheet visible={sheetOpen} onClose={() => (importing ? undefined : setSheetOpen(false))} title="Import into the app" subtitle={`${selected.size} ${selected.size === 1 ? "event" : "events"} selected`}>
        <View style={styles.sheet}>
          <Text style={[type.bodyMd, { color: c.onSurfaceVariant }]}>
            Choose the cost center these events belong to. They are published straight away and people can add posts and stories once the event starts.
          </Text>
          <Text style={[type.labelSm, styles.groupTitle, { color: c.onSurfaceVariant }]}>COST CENTER</Text>
          {costCenters.length === 0 ? (
            <Text style={[type.bodySm, { color: c.onSurfaceVariant }]}>No cost centers are available. Ask an admin to add one.</Text>
          ) : (
            <View style={styles.options}>
              {costCenters.map((center) => {
                const isChosen = center.id === costCenterId;
                return (
                  <Pressable
                    key={center.id}
                    onPress={() => setCostCenterId(center.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isChosen }}
                    style={[styles.option, { borderRadius: layout.radius.md, backgroundColor: isChosen ? c.surfaceContainer : c.surfaceContainerLow }]}
                  >
                    <View style={styles.flex}>
                      <Text style={[type.labelLg, { color: c.onSurface }]} numberOfLines={1}>
                        {center.code} • {center.name}
                      </Text>
                      {cityNameOf(center) ? (
                        <Text style={[type.bodySm, { color: c.onSurfaceVariant }]} numberOfLines={1}>
                          {cityNameOf(center)}
                        </Text>
                      ) : null}
                    </View>
                    {isChosen ? <MaterialCommunityIcons name="check" size={18} color={c.primary} /> : null}
                  </Pressable>
                );
              })}
            </View>
          )}
          <CaptureButton
            label={`Import ${selected.size} ${selected.size === 1 ? "event" : "events"}`}
            icon="calendar-import"
            onPress={() => void runImport()}
            loading={importing}
            disabled={!chosenCostCenter || selected.size === 0}
          />
        </View>
      </BottomSheet>
    </View>
  );
}

type EventRowProps = { event: GoogleCalendarEvent; card: object[]; selected: boolean; onSelect: (next: boolean) => void };

function EventRow({ event, card, selected, onSelect }: EventRowProps) {
  const { c, type } = useCaptureTheme();
  const imported = Boolean(event.importedEventId);
  const canOpen = Boolean(event.htmlLink);
  const accent = imported ? c.statusSuccess : event.allDay ? c.secondary : c.primary;
  return (
    <Pressable
      onPress={imported ? undefined : () => onSelect(!selected)}
      disabled={imported}
      accessibilityRole={imported ? undefined : "checkbox"}
      accessibilityState={imported ? undefined : { checked: selected }}
      accessibilityLabel={`${event.title}, ${timeLabel(event)}${imported ? ", already imported" : ""}`}
      style={({ pressed }) => [card, rowStyles.row, selected && { borderWidth: 1.5, borderColor: c.primary }, pressed && !imported && { backgroundColor: c.surfaceContainerLow }]}
    >
      <View style={[rowStyles.accent, { backgroundColor: accent }]} />
      <View style={rowStyles.check}>
        {imported ? (
          <MaterialCommunityIcons name="check-circle" size={20} color={c.statusSuccess} />
        ) : (
          <Checkbox checked={selected} onChange={onSelect} size={20} label={`Select ${event.title}`} />
        )}
      </View>
      <View style={rowStyles.body}>
        <View style={rowStyles.topLine}>
          <Text style={[type.labelMd, { color: event.allDay ? c.secondary : c.primary }]}>{timeLabel(event)}</Text>
          {imported ? <Badge label="Imported" tone="success" pill /> : event.status === "tentative" ? <Badge label="Tentative" tone="warning" pill /> : null}
        </View>
        <Text style={[type.headlineSm, { color: c.onSurface }]} numberOfLines={2}>
          {event.title}
        </Text>
        {event.location ? (
          <View style={rowStyles.meta}>
            <MaterialCommunityIcons name="map-marker-outline" size={16} color={c.onSurfaceVariant} />
            <Text style={[type.bodySm, rowStyles.metaText, { color: c.onSurfaceVariant }]} numberOfLines={1}>
              {event.location}
            </Text>
          </View>
        ) : null}
        {event.description ? (
          <Text style={[type.bodySm, { color: c.onSurfaceVariant }]} numberOfLines={2}>
            {event.description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}
          </Text>
        ) : null}
        {event.attendeeCount > 0 || event.organizer ? (
          <View style={rowStyles.meta}>
            <MaterialCommunityIcons name="account-group-outline" size={16} color={c.onSurfaceVariant} />
            <Text style={[type.bodySm, rowStyles.metaText, { color: c.onSurfaceVariant }]} numberOfLines={1}>
              {[event.organizer, event.attendeeCount > 0 ? `${event.attendeeCount} invited` : ""].filter(Boolean).join(" • ")}
            </Text>
          </View>
        ) : null}
      </View>
      {canOpen ? (
        <Pressable onPress={() => void Linking.openURL(event.htmlLink)} hitSlop={10} accessibilityRole="link" accessibilityLabel="Open in Google Calendar" style={rowStyles.open}>
          <MaterialCommunityIcons name="open-in-new" size={18} color={c.outline} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

function getStyles(c: CaptureColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.surface },
    content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32, gap: 16 },
    contentWithDock: { paddingBottom: 104 },
    card: { backgroundColor: c.surfaceCard, overflow: "hidden" },
    summary: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
    summaryIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    flex: { flex: 1 },
    group: { gap: 10 },
    groupHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingRight: 4 },
    groupTitle: { letterSpacing: 0.8, paddingHorizontal: 4 },
    sheet: { gap: 12, paddingBottom: 8 },
    options: { gap: 8 },
    option: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingHorizontal: 12, paddingVertical: 8 },
  });
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingRight: 10 },
  accent: { width: 4, alignSelf: "stretch" },
  check: { paddingLeft: 12, alignItems: "center", justifyContent: "center" },
  body: { flex: 1, paddingVertical: 14, paddingHorizontal: 12, gap: 4 },
  topLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  meta: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaText: { flex: 1 },
  open: { padding: 6 },
});
