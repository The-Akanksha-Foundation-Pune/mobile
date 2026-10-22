import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Badge,
  BulkActionDock,
  CaptureButton,
  EmptyState,
  ListLoader,
  PillTabs,
  QueueCard,
  SearchField,
  Toast,
  type ToastTone, popupAlert } from "../components/capture";
import { bulkReviewEvents, fetchAdminEvents, reviewEvent } from "../services/api";
import type { City, EventItem, ReviewStatus } from "../types/app";
import { useCaptureTheme, type CaptureColors } from "../theme/useCaptureTheme";
import { contentKindOf, formatEventDate, reviewStatusOf } from "../utils/eventPresenters";
import { toQueueItem } from "../utils/queueItems";

const TABS: { id: ReviewStatus; label: string }[] = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
];

type Props = {
  token: string;
  cities?: City[];
  /** The event being reviewed; null shows the event list. Owned by the parent so the header can react. */
  eventId: string | null;
  onSelectEvent: (eventId: string | null) => void;
  /** Called after any decision so parents can refresh their own lists. */
  onChanged?: () => void;
};

type EventSummary = { event: EventItem; pending: number; approved: number };

/** Review queue: pick an event first, then approve its posts and stories. */
export function ReviewQueueScreen({ token, eventId, onSelectEvent, onChanged }: Props) {
  const { c, type } = useCaptureTheme();
  const styles = useMemo(() => getStyles(c), [c]);
  const [items, setItems] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<ReviewStatus>("pending");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchAdminEvents(token));
    } catch (error) {
      popupAlert("Could not load the queue", (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  function showToast(message: string, tone: ToastTone = "success") {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, tone });
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  /** Events that have posts or stories, with their review counts. */
  const summaries = useMemo<EventSummary[]>(() => {
    const byId = new Map(items.filter((item) => contentKindOf(item) === "event").map((item) => [item.id, item]));
    const counts = new Map<string, { pending: number; approved: number }>();
    for (const item of items) {
      if (contentKindOf(item) === "event" || !item.parentEventId) continue;
      const entry = counts.get(item.parentEventId) ?? { pending: 0, approved: 0 };
      entry[reviewStatusOf(item)] += 1;
      counts.set(item.parentEventId, entry);
    }
    return Array.from(counts.entries())
      .map(([id, count]) => ({ event: byId.get(id), ...count }))
      .filter((row): row is EventSummary => Boolean(row.event))
      .sort((a, b) => b.pending - a.pending || b.event.eventDate.localeCompare(a.event.eventDate));
  }, [items]);

  const visibleSummaries = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return summaries;
    return summaries.filter(({ event }) => [event.title, event.cityName, event.costCenterName, event.location].some((value) => (value || "").toLowerCase().includes(q)));
  }, [summaries, query]);

  const current = summaries.find((row) => row.event.id === eventId) ?? null;
  const queue = useMemo(
    () => items.filter((item) => item.parentEventId === eventId && contentKindOf(item) !== "event" && reviewStatusOf(item) === tab),
    [items, eventId, tab]
  );
  const selectedVisible = queue.filter((item) => selected.has(item.id));
  const allSelected = queue.length > 0 && selectedVisible.length === queue.length;

  function applyUpdates(updated: EventItem[]) {
    setItems((prev) => prev.map((item) => updated.find((u) => u.id === item.id) ?? item));
    setSelected((prev) => {
      const next = new Set(prev);
      updated.forEach((u) => next.delete(u.id));
      return next;
    });
    onChanged?.();
  }

  async function decide(item: EventItem, status: ReviewStatus) {
    try {
      setBusy(true);
      applyUpdates([await reviewEvent(token, item.id, { status })]);
      showToast(status === "approved" ? "Approved" : "Moved back to pending", status === "approved" ? "success" : "warning");
    } catch (error) {
      popupAlert("Update failed", (error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function approveSelected() {
    const ids = selectedVisible.map((item) => item.id);
    if (!ids.length) return;
    try {
      setBusy(true);
      await bulkReviewEvents(token, ids, "approved");
      await load();
      setSelected(new Set());
      onChanged?.();
      showToast(`${ids.length} item${ids.length === 1 ? "" : "s"} approved`);
    } catch (error) {
      popupAlert("Bulk approve failed", (error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!current) {
    return (
      <SafeAreaView style={styles.safe} edges={[]}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={[type.bodySm, { color: c.onSurfaceVariant }]}>Choose an event to review its posts and stories.</Text>
          <SearchField value={query} onChangeText={setQuery} placeholder="Search events..." size="md" elevated />
          {loading && items.length === 0 ? (
            <ListLoader message="Loading events..." />
          ) : visibleSummaries.length === 0 ? (
            <EmptyState icon="clipboard-check-outline" title="Nothing to review" message="Posts and stories will show up here under their event." />
          ) : (
            <View style={styles.list}>
              {visibleSummaries.map(({ event, pending, approved }) => (
                <Pressable
                  key={event.id}
                  onPress={() => {
                    onSelectEvent(event.id);
                    setTab(pending > 0 ? "pending" : "approved");
                    setSelected(new Set());
                  }}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.eventRow, { backgroundColor: pressed ? c.surfaceContainerLow : c.surfaceCard, borderColor: c.cardBorder }]}
                >
                  <View style={[styles.eventIcon, { backgroundColor: pending > 0 ? "rgba(247,144,9,0.14)" : "rgba(3,152,85,0.12)" }]}>
                    <MaterialCommunityIcons name={pending > 0 ? "clipboard-text-clock-outline" : "clipboard-check-outline"} size={20} color={pending > 0 ? c.pendingText : c.statusSuccess} />
                  </View>
                  <View style={styles.grow}>
                    <Text style={[type.labelLg, { color: c.onSurface }]} numberOfLines={2}>
                      {event.title || "Untitled event"}
                    </Text>
                    <Text style={[type.bodySm, { color: c.onSurfaceVariant }]} numberOfLines={1}>
                      {formatEventDate(event.eventDate)}
                      {event.cityName ? ` • ${event.cityName}` : ""} • {approved} approved
                    </Text>
                  </View>
                  {pending > 0 ? <Badge label={`${pending} pending`} tone="warning" pill /> : <Badge label="Done" tone="success" pill />}
                  <MaterialCommunityIcons name="chevron-right" size={20} color={c.onSurfaceVariant} />
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <PillTabs
          tabs={TABS.map((item) => ({ ...item, count: item.id === "pending" ? current.pending : current.approved }))}
          activeId={tab}
          onSelect={(id) => {
            setTab(id as ReviewStatus);
            setSelected(new Set());
          }}
        />
        {tab === "pending" && queue.length > 0 ? (
          <Pressable onPress={() => setSelected(allSelected ? new Set() : new Set(queue.map((item) => item.id)))} style={styles.selectAll} accessibilityRole="button">
            <MaterialCommunityIcons name="checkbox-multiple-marked-outline" size={18} color={c.primary} />
            <Text style={[type.labelMd, { color: c.primary }]}>{allSelected ? "Deselect All" : "Select All"}</Text>
          </Pressable>
        ) : null}

        {queue.length === 0 ? (
          <EmptyState
            icon={tab === "pending" ? "check-decagram-outline" : "clipboard-text-outline"}
            title={tab === "pending" ? "All reviewed" : "Nothing approved yet"}
            message={tab === "pending" ? "Every post and story for this event has been reviewed." : "Approved items will appear here."}
          />
        ) : (
          <View style={styles.list}>
            {queue.map((item) => (
              <QueueCard
                key={item.id}
                item={toQueueItem(item)}
                selectable={tab === "pending"}
                selected={selected.has(item.id)}
                onToggleSelect={() =>
                  setSelected((prev) => {
                    const next = new Set(prev);
                    if (next.has(item.id)) next.delete(item.id);
                    else next.add(item.id);
                    return next;
                  })
                }
                onApprove={tab === "pending" ? () => void decide(item, "approved") : undefined}
                actions={
                  tab === "approved" ? (
                    <CaptureButton label="Move back to pending" variant="secondary" size="sm" icon="undo-variant" onPress={() => void decide(item, "pending")} disabled={busy} style={styles.grow} />
                  ) : undefined
                }
                busy={busy}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <BulkActionDock visible={tab === "pending"} count={selectedVisible.length} noun="item" actionLabel="Approve Selected" onAction={() => void approveSelected()} busy={busy} />
      <Toast visible={Boolean(toast)} message={toast?.message ?? ""} tone={toast?.tone ?? "success"} />
    </SafeAreaView>
  );
}

function getStyles(c: CaptureColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.surface },
    content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 112, gap: 12 },
    grow: { flex: 1 },
    list: { gap: 12 },
    eventRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12, borderWidth: 1 },
    eventIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    selectAll: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-end", paddingVertical: 4, paddingHorizontal: 8 },
    empty: { textAlign: "center", color: c.onSurfaceVariant, marginTop: 32, fontFamily: "Inter_400Regular", fontSize: 14 },
  });
}
