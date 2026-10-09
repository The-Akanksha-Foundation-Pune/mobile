import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  BulkActionDock,
  FilterSelect,
  PillTabs,
  QueueCard,
  RejectReasonSheet,
  SearchField,
  Toast,
  type BadgeTone,
  type QueueItem,
  type RejectSubmission,
  type ReviewReason,
  type ToastTone,
} from "../components/capture";
import { bulkReviewEvents, fetchAdminEvents, reviewEvent } from "../services/api";
import type { City, EventItem, EventType, ReviewStatus } from "../types/app";
import { useCaptureTheme, type CaptureColors } from "../theme/useCaptureTheme";
import { authorName, reviewStatusOf as statusOf } from "../utils/eventPresenters";
import { formatRelativeTime } from "../utils/relativeTime";

const SEARCH_HINTS = ["Search pending posts", "Search volunteers", "Search cost centers"];

/** Reasons offered when an admin requests changes. Edit this list to change the sheet. */
export const REVIEW_REASONS: ReviewReason[] = [
  { id: "blurry", label: "Blurry or low-light media", description: "Faces or project details are unreadable" },
  { id: "consent", label: "Missing student consent form", description: "An identifiable student has no signed waiver" },
  { id: "cost_center", label: "Incorrect cost center tag", description: "Assigned unit doesn't match the school region" },
  { id: "caption", label: "Incomplete or vague caption", description: "Needs learning outcomes or a child quote" },
];

const TABS: { id: ReviewStatus; label: string }[] = [
  { id: "pending", label: "Pending" },
  { id: "changes_requested", label: "Changes Needed" },
  { id: "approved", label: "Approved" },
];

type Props = {
  token: string;
  cities: City[];
  eventTypes: EventType[];
  /** Called after any decision so parents can refresh their own lists. */
  onChanged?: () => void;
};

function roleTone(role?: string): BadgeTone {
  if (role === "admin") return "tertiary";
  if (role === "employee") return "secondary";
  return "primary";
}

function toQueueItem(event: EventItem): QueueItem {
  const tags: QueueItem["tags"] = [];
  if (event.title) tags.push({ icon: "calendar-blank-outline", label: event.title });
  if (event.eventTypeName) tags.push({ icon: "shape-outline", label: event.eventTypeName });
  if (event.costCenterCode) tags.push({ icon: "tag-outline", label: event.costCenterCode });
  const role = event.uploadedByRole;
  return {
    id: event.id,
    authorName: authorName(event),
    authorRole: role ? role.charAt(0).toUpperCase() + role.slice(1) : undefined,
    roleTone: roleTone(role),
    metaLine: `${event.costCenterName || event.cityName || "No location"} • ${formatRelativeTime(event.createdAt)}`,
    caption: event.caption,
    media:
      event.mediaType === "video"
        ? { kind: "video", uri: event.mediaUrl, badge: { icon: "video", label: "Video clip", iconColor: "#FBDA1D" } }
        : { kind: "photo", uri: event.mediaUrl },
    tags,
    note:
      statusOf(event) === "changes_requested" && event.reviewReason
        ? `Changes requested: ${event.reviewReason}${event.reviewNote ? ` — ${event.reviewNote}` : ""}`
        : undefined,
  };
}

/** Admin moderation queue: filter, review one by one, or approve in bulk. */
export function ReviewQueueScreen({ token, cities, eventTypes, onChanged }: Props) {
  const { c, type } = useCaptureTheme();
  const styles = useMemo(() => getStyles(c), [c]);
  const [items, setItems] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<ReviewStatus>("pending");
  const [query, setQuery] = useState("");
  const [cityId, setCityId] = useState("");
  const [typeId, setTypeId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [rejectTarget, setRejectTarget] = useState<EventItem | null>(null);
  const [toast, setToast] = useState<{ message: string; tone: ToastTone } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await fetchAdminEvents(token));
    } catch (error) {
      Alert.alert("Could not load the queue", (error as Error).message);
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

  const counts = useMemo(() => {
    const base: Record<ReviewStatus, number> = { pending: 0, approved: 0, changes_requested: 0 };
    for (const event of items) base[statusOf(event)] += 1;
    return base;
  }, [items]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((event) => {
      if (statusOf(event) !== tab) return false;
      if (cityId && event.cityId !== cityId) return false;
      if (typeId && event.typeId !== typeId) return false;
      if (!q) return true;
      return [event.title, event.caption, event.uploadedByName, event.uploadedByEmail, event.costCenterCode, event.costCenterName]
        .some((value) => (value || "").toLowerCase().includes(q));
    });
  }, [items, tab, cityId, typeId, query]);

  const selectedVisible = visible.filter((event) => selected.has(event.id));
  const allSelected = visible.length > 0 && selectedVisible.length === visible.length;

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function applyUpdates(updated: EventItem[]) {
    setItems((prev) => prev.map((event) => updated.find((u) => u.id === event.id) ?? event));
    setSelected((prev) => {
      const next = new Set(prev);
      updated.forEach((u) => next.delete(u.id));
      return next;
    });
    onChanged?.();
  }

  async function approve(event: EventItem) {
    try {
      setBusy(true);
      applyUpdates([await reviewEvent(token, event.id, { status: "approved" })]);
      showToast(`Post by ${authorName(event)} approved!`);
    } catch (error) {
      Alert.alert("Approve failed", (error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function approveSelected() {
    const ids = selectedVisible.map((event) => event.id);
    if (!ids.length) return;
    try {
      setBusy(true);
      await bulkReviewEvents(token, ids, "approved");
      await load();
      setSelected(new Set());
      onChanged?.();
      showToast(`${ids.length} post${ids.length === 1 ? "" : "s"} approved!`);
    } catch (error) {
      Alert.alert("Bulk approve failed", (error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submitReject({ reasonLabel, note }: RejectSubmission) {
    if (!rejectTarget) return;
    try {
      setBusy(true);
      applyUpdates([
        await reviewEvent(token, rejectTarget.id, { status: "changes_requested", reason: reasonLabel, note: note || undefined }),
      ]);
      setRejectTarget(null);
      showToast(`Feedback sent: ${reasonLabel}`, "warning");
    } catch (error) {
      Alert.alert("Could not send feedback", (error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <SearchField value={query} onChangeText={setQuery} placeholders={SEARCH_HINTS} />
        <PillTabs
          tabs={TABS.map((item) => ({ ...item, count: counts[item.id] }))}
          activeId={tab}
          onSelect={(id) => {
            setTab(id as ReviewStatus);
            setSelected(new Set());
          }}
        />
        <View style={styles.filterRow}>
          <View style={styles.filters}>
            <FilterSelect label="City" allLabel="All Cities" options={cities.map((city) => ({ id: city.id, label: city.name }))} valueId={cityId} onChange={setCityId} />
            <FilterSelect label="Event type" allLabel="All Events" options={eventTypes.map((item) => ({ id: item.id, label: item.name }))} valueId={typeId} onChange={setTypeId} />
          </View>
          {tab === "pending" && visible.length > 0 ? (
            <Pressable
              onPress={() => setSelected(allSelected ? new Set() : new Set(visible.map((event) => event.id)))}
              style={styles.selectAll}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="checkbox-multiple-marked-outline" size={18} color={c.primary} />
              <Text style={[type.labelMd, { color: c.primary }]}>{allSelected ? "Deselect All" : "Select All"}</Text>
            </Pressable>
          ) : null}
        </View>

        {loading && items.length === 0 ? (
          <Text style={styles.empty}>Loading queue...</Text>
        ) : visible.length === 0 ? (
          <Text style={styles.empty}>Nothing here right now.</Text>
        ) : null}

        <View style={styles.list}>
          {visible.map((event) => (
            <QueueCard
              key={event.id}
              item={toQueueItem(event)}
              selectable={tab === "pending"}
              selected={selected.has(event.id)}
              onToggleSelect={() => toggleSelect(event.id)}
              onApprove={tab !== "approved" ? () => void approve(event) : undefined}
              onReject={tab !== "changes_requested" ? () => setRejectTarget(event) : undefined}
              busy={busy}
            />
          ))}
        </View>
      </ScrollView>

      <BulkActionDock visible={tab === "pending"} count={selectedVisible.length} noun="post" actionLabel="Approve Selected" onAction={() => void approveSelected()} busy={busy} />
      <RejectReasonSheet
        visible={Boolean(rejectTarget)}
        subtitle={rejectTarget ? `${rejectTarget.title || "Untitled post"} • ${authorName(rejectTarget)}` : undefined}
        reasons={REVIEW_REASONS}
        submitting={busy}
        onCancel={() => setRejectTarget(null)}
        onSubmit={(submission) => void submitReject(submission)}
      />
      <Toast visible={Boolean(toast)} message={toast?.message ?? ""} tone={toast?.tone ?? "success"} />
    </SafeAreaView>
  );
}

function getStyles(c: CaptureColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.surface },
    content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 112, gap: 12 },
    filterRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    filters: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 },
    selectAll: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4, paddingHorizontal: 8 },
    list: { gap: 16 },
    empty: { textAlign: "center", color: c.onSurfaceVariant, marginTop: 32, fontFamily: "Inter_400Regular", fontSize: 14 },
  });
}
