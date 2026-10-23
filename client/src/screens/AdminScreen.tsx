import { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { AI_POLISH_ENABLED } from "../config/constants";
import {
  createCityAdmin,
  createCostCenterAdmin,
  deleteCalendarEntry,
  fetchAdminCalendar,
  fetchAdminEvents,
  fetchAllCitiesAdmin,
  fetchAllCostCentersAdmin,
  fetchSettings,
  moderateEvent,
  updateLimits,
  notifyEventDonors,
  updateCostCenterAdmin,
  upsertCalendarEntry,
} from "../services/api";
import { filterAllowedCities } from "../config/cities";
import type { CalendarEntry, City, CostCenter, EventItem } from "../types/app";
import { CaptureHeader } from "../components";
import {
  Badge,
  CaptureButton,
  CaptureInput,
  ChipGroup,
  EmptyState,
  IconButton,
  PillTabs,
  TagChip,
  TextButton, popupAlert } from "../components/capture";
import { useCaptureTheme, type CaptureColors } from "../theme/useCaptureTheme";
import { contentKindOf, eventStatusPresentation, formatEventDate, reviewStatusOf, reviewStatusPresentation } from "../utils/eventPresenters";
import { groupCostCentersByCity } from "../utils/costCenterGrouping";

type AdminScreenProps = {
  token: string;
  onClose: () => void;
};

type AdminTab = "events" | "calendar" | "cities" | "costCenters" | "limits";

const TABS: { id: AdminTab; label: string }[] = [
  { id: "events", label: "Content" },
  { id: "calendar", label: "Calendar" },
  { id: "cities", label: "Cities" },
  { id: "costCenters", label: "Cost centers" },
  { id: "limits", label: "Limits" },
];


/** Settings console for Super Admins: content status, calendar entries, cities and cost centers. */
export function AdminScreen({ token, onClose }: AdminScreenProps) {
  const { c, type } = useCaptureTheme();
  const styles = useMemo(() => getStyles(c), [c]);
  const [tab, setTab] = useState<AdminTab>("events");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [calendar, setCalendar] = useState<CalendarEntry[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [busy, setBusy] = useState(false);
  const [newCityName, setNewCityName] = useState("");
  const [newCityState, setNewCityState] = useState("");
  const [calendarTitle, setCalendarTitle] = useState("");
  const [calendarDate, setCalendarDate] = useState(new Date().toISOString().slice(0, 10));
  const [calendarLocation, setCalendarLocation] = useState("");
  const [calendarCostCenterId, setCalendarCostCenterId] = useState("");
  const [limitPosts, setLimitPosts] = useState("5");
  const [limitStories, setLimitStories] = useState("1");
  const [limitPolish, setLimitPolish] = useState("2");
  const scrollRef = useRef<ScrollView>(null);
  const [editingCostCenter, setEditingCostCenter] = useState<CostCenter | null>(null);
  const [costCenterCode, setCostCenterCode] = useState("");
  const [costCenterName, setCostCenterName] = useState("");
  const [costCenterCityId, setCostCenterCityId] = useState("");
  // Turned-off cost centers stay manageable here but can't be picked for new calendar entries.
  const costCenterSections = useMemo(() => groupCostCentersByCity(costCenters.filter((item) => item.isActive)), [costCenters]);
  const allCostCenterSections = useMemo(() => groupCostCentersByCity(costCenters), [costCenters]);
  const activeCities = useMemo(() => cities.filter((city) => city.isActive), [cities]);

  async function refresh() {
    const [adminEvents, adminCalendar, adminCities, adminCostCenters, settings] = await Promise.all([
      fetchAdminEvents(token),
      fetchAdminCalendar(token),
      fetchAllCitiesAdmin(token),
      fetchAllCostCentersAdmin(token),
      fetchSettings(token),
    ]);
    setLimitPosts(String(settings.limits.posts));
    setLimitStories(String(settings.limits.stories));
    setLimitPolish(String(settings.limits.polish));
    setEvents(adminEvents);
    setCalendar(adminCalendar);
    setCities(filterAllowedCities(adminCities));
    setCostCenters(adminCostCenters);
    if (!calendarCostCenterId && adminCostCenters[0]) {
      setCalendarCostCenterId(adminCostCenters[0].id);
    }
  }

  useEffect(() => {
    void refresh().catch((error) => popupAlert("Admin load failed", (error as Error).message));
  }, [token]);

  async function run(label: string, action: () => Promise<void>) {
    try {
      setBusy(true);
      await action();
      await refresh();
    } catch (error) {
      popupAlert(label, (error as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function updateEvent(eventId: string, patch: { approvedForGallery?: boolean }) {
    return run("Update failed", async () => {
      await moderateEvent({ token, eventId, ...patch });
    });
  }

  function handleCreateCity() {
    if (!newCityName.trim()) {
      popupAlert("Missing city", "Enter a city name.");
      return;
    }
    void run("Create city failed", async () => {
      await createCityAdmin({ token, name: newCityName.trim(), state: newCityState.trim() || undefined });
      setNewCityName("");
      setNewCityState("");
    });
  }

  function resetCostCenterForm() {
    setEditingCostCenter(null);
    setCostCenterCode("");
    setCostCenterName("");
    setCostCenterCityId("");
  }

  function startEditCostCenter(center: CostCenter) {
    setEditingCostCenter(center);
    setCostCenterCode(center.code);
    setCostCenterName(center.name);
    setCostCenterCityId(center.cityId || "");
    // The form sits at the top of the tab; bring it into view.
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }

  function handleSaveCostCenter() {
    if (!costCenterCode.trim() || !costCenterName.trim() || !costCenterCityId) {
      popupAlert("Missing fields", "Code, name and city are required.");
      return;
    }
    const input = { code: costCenterCode.trim(), name: costCenterName.trim(), cityId: costCenterCityId };
    const editing = editingCostCenter;
    void run(editing ? "Update cost center failed" : "Create cost center failed", async () => {
      if (editing) await updateCostCenterAdmin(token, editing.id, input);
      else await createCostCenterAdmin(token, input);
      resetCostCenterForm();
    });
  }

  function handleToggleCostCenter(center: CostCenter) {
    const turningOff = center.isActive;
    popupAlert(
      turningOff ? "Turn off cost center?" : "Turn on cost center?",
      turningOff
        ? `${center.code} will no longer be offered when choosing a cost center. Existing events keep it.`
        : `${center.code} will be offered again when choosing a cost center.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: turningOff ? "Turn off" : "Turn on",
          style: turningOff ? "destructive" : "default",
          onPress: () =>
            void run("Update cost center failed", async () => {
              await updateCostCenterAdmin(token, center.id, { isActive: !turningOff });
            }),
        },
      ]
    );
  }

  function handleNotifyDonors(event: EventItem) {
    popupAlert("Notify donors?", `Send an update about "${event.title || "Untitled"}" to the donors of its cost center.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Send",
        onPress: () =>
          void run("Notify failed", async () => {
            const result = await notifyEventDonors(token, event.id);
            popupAlert("Donors notified", `Queued updates for ${result.notifiedCount} donor(s).`);
          }),
      },
    ]);
  }

  function handleCreateCalendarEntry() {
    if (!calendarTitle.trim() || !calendarCostCenterId) {
      popupAlert("Missing fields", "Title and cost center are required.");
      return;
    }
    const center = costCenters.find((item) => item.id === calendarCostCenterId);
    void run("Calendar save failed", async () => {
      await upsertCalendarEntry({
        token,
        payload: {
          title: calendarTitle.trim(),
          eventDate: calendarDate,
          location: calendarLocation.trim() || undefined,
          costCenterId: calendarCostCenterId,
          cityId: center?.cityId || null,
          isPublished: true,
        },
      });
      setCalendarTitle("");
      setCalendarLocation("");
    });
  }

  function handleSaveLimits() {
    const posts = Number(limitPosts);
    const stories = Number(limitStories);
    const polish = Number(limitPolish);
    const valid = (value: number) => Number.isInteger(value) && value >= 0 && value <= 100;
    if (!valid(posts) || !valid(stories) || !valid(polish)) {
      popupAlert("Check the numbers", "Limits must be whole numbers between 0 and 100.");
      return;
    }
    void run("Save limits failed", async () => {
      const result = await updateLimits(token, { posts, stories, polish });
      setLimitPosts(String(result.limits.posts));
      setLimitStories(String(result.limits.stories));
      setLimitPolish(String(result.limits.polish));
      popupAlert(
        "Saved",
        `Each person can now add ${result.limits.posts} posts and ${result.limits.stories} ${result.limits.stories === 1 ? "story" : "stories"} per event${
          AI_POLISH_ENABLED ? `, and polish each description ${result.limits.polish} ${result.limits.polish === 1 ? "time" : "times"} with AI` : ""
        }.`
      );
    });
  }

  function handleDeleteEntry(entry: CalendarEntry) {
    popupAlert("Delete entry?", `"${entry.title}" will be removed from the calendar.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void run("Delete failed", () => deleteCalendarEntry(token, entry.id)) },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <CaptureHeader
        title="Admin console"
        subtitle="Content, calendar, cities and cost centers"
        onBack={onClose}
        right={<IconButton icon="refresh" size={44} onPress={() => void refresh()} accessibilityLabel="Refresh" />}
      />

      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <PillTabs tabs={TABS} activeId={tab} onSelect={(id) => setTab(id as AdminTab)} variant="inverse" size="md" />

        {tab === "events" ? (
          events.length === 0 ? (
            <EmptyState icon="file-document-outline" title="No content yet" message="Events, posts and stories will show up here." />
          ) : (
            <View style={styles.list}>
              {events.map((event) => {
                const kind = contentKindOf(event);
                const status = eventStatusPresentation(event.eventStatus);
                const review = reviewStatusPresentation(reviewStatusOf(event));
                return (
                  <View key={event.id} style={styles.card}>
                    <View style={styles.cardHead}>
                      <Text style={[type.labelLg, styles.grow, { color: c.onSurface }]} numberOfLines={2}>
                        {event.title || (kind === "post" && event.parentTitle ? `Post on ${event.parentTitle}` : "Untitled")}
                      </Text>
                      <Badge label={kind.charAt(0).toUpperCase() + kind.slice(1)} tone={kind === "event" ? "tertiary" : kind === "story" ? "secondary" : "neutral"} />
                    </View>
                    <Text style={[type.bodySm, { color: c.onSurfaceVariant }]} numberOfLines={2}>
                      {event.caption}
                    </Text>
                    <View style={styles.tags}>
                      <TagChip icon="calendar-blank-outline" label={formatEventDate(event.eventDate)} />
                      {event.costCenterCode ? <TagChip icon="tag-outline" label={event.costCenterCode} /> : null}
                    </View>
                    <View style={styles.badges}>
                      <Badge label={status.label} tone={status.tone} pill />
                      {kind !== "event" ? <Badge label={review.label} tone={review.tone} pill /> : null}
                    </View>
                    <View style={[styles.actions, { borderTopColor: c.cardBorder }]}>
                      {kind !== "event" ? (
                        <CaptureButton
                        label={event.approvedForGallery ? "Approved" : "Approve"}
                        variant={event.approvedForGallery ? "secondary" : "success"}
                        size="sm"
                        icon={event.approvedForGallery ? "check-circle" : "check"}
                        iconColor={event.approvedForGallery ? c.statusSuccess : undefined}
                        disabled={busy}
                        onPress={() => void updateEvent(event.id, { approvedForGallery: !event.approvedForGallery })}
                        style={styles.grow}
                      />
                      ) : null}
                      {event.costCenterId ? <TextButton label="Notify donors" icon="send-outline" onPress={() => handleNotifyDonors(event)} /> : null}
                    </View>
                  </View>
                );
              })}
            </View>
          )
        ) : null}

        {tab === "calendar" ? (
          <View style={styles.list}>
            <View style={styles.card}>
              <Text style={[type.headlineSm, { color: c.onSurface }]}>Add calendar entry</Text>
              <CaptureInput label="Title" value={calendarTitle} onChangeText={setCalendarTitle} placeholder="e.g. Annual Health Camp" />
              <CaptureInput label="Date" value={calendarDate} onChangeText={setCalendarDate} placeholder="YYYY-MM-DD" autoCapitalize="none" />
              <CaptureInput label="Location" value={calendarLocation} onChangeText={setCalendarLocation} placeholder="Venue or centre" />
              <Text style={[type.labelMd, { color: c.onSurfaceVariant }]}>Cost center</Text>
              {costCenterSections.map((section) => (
                <View key={section.cityId} style={styles.group}>
                  <View style={styles.groupHead}>
                    <MaterialCommunityIcons name="map-marker-outline" size={16} color={c.tertiary} />
                    <Text style={[type.labelSm, { color: c.tertiary }]}>{section.cityName.toUpperCase()}</Text>
                  </View>
                  <ChipGroup
                    options={section.data.map((item) => ({ id: item.id, label: item.code }))}
                    valueId={calendarCostCenterId}
                    onChange={setCalendarCostCenterId}
                  />
                </View>
              ))}
              <CaptureButton label="Save calendar entry" icon="calendar-plus" onPress={handleCreateCalendarEntry} loading={busy} />
            </View>

            {calendar.length === 0 ? (
              <EmptyState icon="calendar-blank-outline" title="No calendar entries" message="Entries you add appear in the app's calendar." />
            ) : (
              calendar.map((entry) => (
                <View key={entry.id} style={styles.card}>
                  <Text style={[type.labelLg, { color: c.onSurface }]}>{entry.title}</Text>
                  <View style={styles.tags}>
                    <TagChip icon="calendar-blank-outline" label={formatEventDate(entry.eventDate)} />
                    {entry.costCenterCode || entry.costCenterName ? <TagChip icon="tag-outline" label={entry.costCenterCode || entry.costCenterName} /> : null}
                    {entry.location ? <TagChip icon="map-marker-outline" label={entry.location} /> : null}
                  </View>
                  <View style={[styles.actions, styles.actionsEnd, { borderTopColor: c.cardBorder }]}>
                    <CaptureButton label="Delete" variant="secondary" size="sm" icon="trash-can-outline" iconColor={c.statusDanger} disabled={busy} onPress={() => handleDeleteEntry(entry)} />
                  </View>
                </View>
              ))
            )}
          </View>
        ) : null}

        {tab === "limits" ? (
          <View style={styles.list}>
            <View style={styles.card}>
              <Text style={[type.headlineSm, { color: c.onSurface }]}>Per-person limits</Text>
              <Text style={[type.bodySm, { color: c.onSurfaceVariant }]}>
                How many posts and stories one person may add to a single event. Pending and approved items both count. Super Admins are not limited.
              </Text>
              <CaptureInput label="Posts per person, per event" value={limitPosts} onChangeText={setLimitPosts} keyboardType="number-pad" placeholder="5" />
              <CaptureInput label="Stories per person, per event" value={limitStories} onChangeText={setLimitStories} keyboardType="number-pad" placeholder="1" />
              {AI_POLISH_ENABLED ? null : (
                <CaptureButton label="Save limits" icon="content-save-outline" onPress={handleSaveLimits} loading={busy} />
              )}
            </View>
            {AI_POLISH_ENABLED ? (
              <View style={styles.card}>
                <Text style={[type.headlineSm, { color: c.onSurface }]}>AI polish</Text>
                <Text style={[type.bodySm, { color: c.onSurfaceVariant }]}>
                  How many times "Polish with AI" may run on one description while writing a post, story or event. Each run calls Google Gemini. Set 0 to turn it off. Applies to everyone, including Super Admins.
                </Text>
                <CaptureInput label="Polishes per description" value={limitPolish} onChangeText={setLimitPolish} keyboardType="number-pad" placeholder="2" />
                <CaptureButton label="Save limits" icon="content-save-outline" onPress={handleSaveLimits} loading={busy} />
              </View>
            ) : null}
          </View>
        ) : null}

        {tab === "cities" ? (
          <View style={styles.list}>
            <View style={styles.card}>
              <Text style={[type.headlineSm, { color: c.onSurface }]}>Add city</Text>
              <CaptureInput label="City name" value={newCityName} onChangeText={setNewCityName} placeholder="e.g. Nagpur" />
              <CaptureInput label="State" value={newCityState} onChangeText={setNewCityState} placeholder="e.g. Maharashtra" />
              <CaptureButton label="Create city" icon="plus" onPress={handleCreateCity} loading={busy} />
            </View>
            {cities.map((city) => (
              <View key={city.id} style={[styles.card, styles.cityRow]}>
                <View style={[styles.cityIcon, { backgroundColor: c.surfaceContainerHigh }]}>
                  <MaterialCommunityIcons name="city-variant-outline" size={20} color={c.primary} />
                </View>
                <View style={styles.grow}>
                  <Text style={[type.labelLg, { color: c.onSurface }]}>{city.name}</Text>
                  <Text style={[type.bodySm, { color: c.onSurfaceVariant }]}>{city.state || "State not set"}</Text>
                </View>
                <Badge label={city.isActive ? "Active" : "Inactive"} tone={city.isActive ? "success" : "neutral"} pill />
              </View>
            ))}
          </View>
        ) : null}

        {tab === "costCenters" ? (
          <View style={styles.list}>
            <View style={styles.card}>
              <Text style={[type.headlineSm, { color: c.onSurface }]}>{editingCostCenter ? `Edit ${editingCostCenter.code}` : "Add cost center"}</Text>
              {editingCostCenter?.financeId ? (
                <Text style={[type.bodySm, { color: c.statusWarning }]}>
                  This cost center comes from Finance. If Finance sync is on, its name, city and status are replaced by Finance's values on the next sync.
                </Text>
              ) : null}
              <CaptureInput label="Code" value={costCenterCode} onChangeText={setCostCenterCode} placeholder="e.g. COACH-PUNE" autoCapitalize="characters" />
              <CaptureInput label="Name" value={costCenterName} onChangeText={setCostCenterName} placeholder="e.g. Coaches - Pune" />
              <Text style={[type.labelMd, { color: c.onSurfaceVariant }]}>City</Text>
              <ChipGroup options={activeCities.map((city) => ({ id: city.id, label: city.name }))} valueId={costCenterCityId} onChange={setCostCenterCityId} />
              <View style={styles.formActions}>
                {editingCostCenter ? <CaptureButton label="Cancel" variant="secondary" onPress={resetCostCenterForm} disabled={busy} style={styles.grow} /> : null}
                <CaptureButton
                  label={editingCostCenter ? "Save changes" : "Create cost center"}
                  icon={editingCostCenter ? "content-save-outline" : "plus"}
                  onPress={handleSaveCostCenter}
                  loading={busy}
                  style={styles.grow}
                />
              </View>
            </View>

            {allCostCenterSections.length === 0 ? (
              <EmptyState icon="tag-outline" title="No cost centers" message="Cost centers you add appear here, grouped by city." />
            ) : (
              allCostCenterSections.map((section) => (
                <View key={section.cityId} style={styles.group}>
                  <View style={styles.groupHead}>
                    <MaterialCommunityIcons name="map-marker-outline" size={16} color={c.tertiary} />
                    <Text style={[type.labelSm, { color: c.tertiary }]}>{section.cityName.toUpperCase()}</Text>
                  </View>
                  {section.data.map((center) => (
                    <View key={center.id} style={styles.card}>
                      <View style={styles.cardHead}>
                        <View style={styles.grow}>
                          <Text style={[type.labelLg, { color: c.onSurface }]}>{center.code}</Text>
                          <Text style={[type.bodySm, { color: c.onSurfaceVariant }]}>{center.name}</Text>
                        </View>
                        <Badge label={center.isActive ? "Active" : "Off"} tone={center.isActive ? "success" : "neutral"} pill />
                      </View>
                      <View style={styles.tags}>
                        <TagChip icon="account-heart-outline" label={`${center.donorCount ?? 0} ${center.donorCount === 1 ? "donor" : "donors"}`} />
                        {center.financeId ? <TagChip icon="sync" label="From Finance" /> : null}
                      </View>
                      <View style={[styles.actions, styles.actionsEnd, { borderTopColor: c.cardBorder }]}>
                        <CaptureButton label="Edit" variant="secondary" size="sm" icon="pencil-outline" disabled={busy} onPress={() => startEditCostCenter(center)} />
                        <CaptureButton
                          label={center.isActive ? "Turn off" : "Turn on"}
                          variant="secondary"
                          size="sm"
                          icon={center.isActive ? "toggle-switch-off-outline" : "toggle-switch-outline"}
                          iconColor={center.isActive ? c.statusDanger : c.statusSuccess}
                          disabled={busy}
                          onPress={() => handleToggleCostCenter(center)}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              ))
            )}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function getStyles(c: CaptureColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.surface },
    content: { padding: 16, gap: 14, paddingBottom: 32 },
    list: { gap: 12 },
    card: {
      gap: 10,
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
      backgroundColor: c.surfaceCard,
    },
    cardHead: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
    grow: { flex: 1 },
    tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    badges: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    actions: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 10, borderTopWidth: 1 },
    actionsEnd: { justifyContent: "flex-end" },
    formActions: { flexDirection: "row", gap: 10 },
    group: { gap: 8 },
    groupHead: { flexDirection: "row", alignItems: "center", gap: 4 },
    cityRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    cityIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  });
}
