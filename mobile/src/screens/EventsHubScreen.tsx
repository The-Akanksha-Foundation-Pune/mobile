import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { EventCalendar } from "../components/EventCalendar";
import { EventPosterCard } from "../components/EventPosterCard";
import { fetchCalendarEntries, fetchEvents } from "../services/api";
import type { CalendarEntry, City, CostCenter, EventItem, HubTab } from "../types/app";
import { darkPalette, palette } from "../theme/theme";
import {
  getDummyCalendarEntries,
  getDummyCompletedEventsByCity,
  getDummyOngoingEvents,
  getDummyUpcomingEvents,
  USE_DUMMY_HUB_DATA,
} from "../data/dummyHubData";
import { formatDisplayDate, groupByDateAndLocation } from "../utils/eventGrouping";

type EventsHubScreenProps = {
  token: string;
  city: City;
  costCenter: CostCenter;
  isAdmin: boolean;
  onChangeCity: () => void;
  onChangeCostCenter: () => void;
  onOpenAdd: () => void;
  onOpenAdmin: () => void;
  onOpenProfile: () => void;
};

export function EventsHubScreen({
  token,
  city,
  costCenter,
  isAdmin,
  onChangeCity,
  onChangeCostCenter,
  onOpenAdd,
  onOpenAdmin,
  onOpenProfile,
}: EventsHubScreenProps) {
  const [activeTab, setActiveTab] = useState<HubTab>("ongoing");
  const [ongoing, setOngoing] = useState<EventItem[]>([]);
  const [upcoming, setUpcoming] = useState<EventItem[]>([]);
  const [completedEvents, setCompletedEvents] = useState<EventItem[]>([]);
  const [calendarEntries, setCalendarEntries] = useState<CalendarEntry[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const isDark = useColorScheme() === "dark";
  const styles = useMemo(() => getStyles(isDark), [isDark]);
  const colors = isDark ? darkPalette : palette;

  const ongoingEvents = useMemo(
    () => (USE_DUMMY_HUB_DATA ? getDummyOngoingEvents(costCenter) : ongoing),
    [costCenter, ongoing]
  );
  const upcomingEvents = useMemo(
    () => (USE_DUMMY_HUB_DATA ? getDummyUpcomingEvents(costCenter) : upcoming),
    [costCenter, upcoming]
  );
  const captureEvents = useMemo(
    () => (USE_DUMMY_HUB_DATA ? getDummyCompletedEventsByCity(city) : completedEvents),
    [city, completedEvents]
  );
  const calendarForDisplay = useMemo(
    () => (USE_DUMMY_HUB_DATA ? getDummyCalendarEntries(costCenter, month) : calendarEntries),
    [costCenter, month, calendarEntries]
  );
  const captureGroups = useMemo(() => groupByDateAndLocation(captureEvents), [captureEvents]);

  const dateEntries = useMemo(
    () => calendarForDisplay.filter((entry) => entry.eventDate === selectedDate),
    [calendarForDisplay, selectedDate]
  );

  async function loadHubData() {
    if (USE_DUMMY_HUB_DATA) {
      return;
    }
    setLoading(true);
    try {
      const [ongoingResult, upcomingResult, completeResult, calendarResult] = await Promise.allSettled([
        fetchEvents({ token, costCenterId: costCenter.id, status: "ongoing" }),
        fetchEvents({ token, costCenterId: costCenter.id, status: "upcoming" }),
        fetchEvents({ token, cityId: city.id, status: "complete" }),
        fetchCalendarEntries({ token, costCenterId: costCenter.id, month }),
      ]);
      setOngoing(ongoingResult.status === "fulfilled" ? ongoingResult.value : []);
      setUpcoming(upcomingResult.status === "fulfilled" ? upcomingResult.value : []);
      setCompletedEvents(completeResult.status === "fulfilled" ? completeResult.value : []);
      setCalendarEntries(calendarResult.status === "fulfilled" ? calendarResult.value : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadHubData();
  }, [token, costCenter.id, city.id, month]);

  function renderHorizontalEvents(events: EventItem[], emptyLabel: string) {
    if (events.length === 0) {
      return <Text style={styles.empty}>{emptyLabel}</Text>;
    }
    return (
      <FlatList
        horizontal
        data={events}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.horizontalList}
        renderItem={({ item }) => (
          <EventPosterCard event={item} onPress={() => setSelectedEvent(item)} />
        )}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <View style={styles.selectorRow}>
          <Pressable style={styles.cityChip} onPress={onChangeCity}>
            <Ionicons name="business" size={14} color="#fff" />
            <Text style={styles.cityChipText}>{city.name}</Text>
            <Ionicons name="chevron-down" size={14} color="#fff" />
          </Pressable>
          <Pressable style={styles.cityChip} onPress={onChangeCostCenter}>
            <Ionicons name="grid" size={14} color="#fff" />
            <Text style={styles.cityChipText}>{costCenter.code}</Text>
            <Ionicons name="chevron-down" size={14} color="#fff" />
          </Pressable>
        </View>
        <View style={styles.topActions}>
          {isAdmin ? (
            <Pressable style={styles.iconBtn} onPress={onOpenAdmin}>
              <Ionicons name="shield-checkmark-outline" size={20} color="#fff" />
            </Pressable>
          ) : null}
          <Pressable style={styles.iconBtn} onPress={onOpenProfile}>
            <Ionicons name="person-circle-outline" size={22} color="#fff" />
          </Pressable>
        </View>
      </View>

      <View style={styles.tabRow}>
        {(
          [
            { id: "ongoing", label: "Ongoing" },
            { id: "upcoming", label: "Upcoming" },
            { id: "capture", label: "CaptureAkanksha" },
            { id: "calendar", label: "Calendar" },
          ] as Array<{ id: HubTab; label: string }>
        ).map((tab) => (
          <Pressable
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? <Text style={styles.loading}>Refreshing events...</Text> : null}

        {activeTab === "ongoing" ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ongoing — {costCenter.name}</Text>
            {USE_DUMMY_HUB_DATA ? (
              <Text style={styles.sectionHint}>Preview — events happening now.</Text>
            ) : null}
            {renderHorizontalEvents(ongoingEvents, "No ongoing events in this city yet.")}
          </View>
        ) : null}

        {activeTab === "upcoming" ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming — {costCenter.name}</Text>
            {USE_DUMMY_HUB_DATA ? (
              <Text style={styles.sectionHint}>Preview — scheduled upcoming events.</Text>
            ) : null}
            {renderHorizontalEvents(upcomingEvents, "No upcoming events in this city yet.")}
          </View>
        ) : null}

        {activeTab === "capture" ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>CaptureAkanksha</Text>
            <Text style={styles.sectionHint}>
              All completed events in {city.name}, grouped by date and location.
            </Text>
            {captureGroups.length === 0 ? (
              <Text style={styles.empty}>No completed events in {city.name} yet.</Text>
            ) : (
              captureGroups.map((group) => (
                <View key={group.date} style={styles.galleryGroup}>
                  <Text style={styles.galleryDate}>{formatDisplayDate(group.date)}</Text>
                  {group.locations.map((loc) => (
                    <View key={`${group.date}-${loc.location}`} style={styles.locationBlock}>
                      <View style={styles.locationHeader}>
                        <Ionicons name="location-outline" size={14} color={colors.brand} />
                        <Text style={styles.locationTitle}>{loc.location}</Text>
                      </View>
                      <View style={styles.galleryGrid}>
                        {loc.items.map((event) => (
                          <Pressable
                            key={event.id}
                            style={({ pressed }) => [styles.galleryCard, pressed && styles.pressed]}
                            onPress={() => setSelectedEvent(event)}
                          >
                            {event.mediaType === "photo" && event.mediaUrl ? (
                              <Image source={{ uri: event.mediaUrl }} style={styles.galleryImage} />
                            ) : (
                              <View style={styles.galleryFallback}>
                                <Ionicons name="videocam-outline" size={18} color={colors.brand} />
                              </View>
                            )}
                            <Text style={styles.galleryCardTitle} numberOfLines={2}>
                              {event.title || "Untitled"}
                            </Text>
                            {event.costCenterCode ? (
                              <Text style={styles.galleryCostCenter}>{event.costCenterCode}</Text>
                            ) : null}
                            {event.approvedForGallery ? (
                              <Text style={styles.galleryApproved}>Gallery</Text>
                            ) : null}
                          </Pressable>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              ))
            )}
          </View>
        ) : null}

        {activeTab === "calendar" ? (
          <View style={styles.section}>
            <EventCalendar
              month={month}
              selectedDate={selectedDate}
              entries={calendarForDisplay}
              onMonthChange={setMonth}
              onSelectDate={setSelectedDate}
            />
            {USE_DUMMY_HUB_DATA ? (
              <Text style={styles.sectionHint}>Preview — tap a date to see scheduled events.</Text>
            ) : null}
            <Text style={styles.sectionTitle}>Events on {formatDisplayDate(selectedDate)}</Text>
            {dateEntries.length === 0 ? (
              <Text style={styles.empty}>No calendar events on this date.</Text>
            ) : (
              dateEntries.map((entry) => (
                <View key={entry.id} style={styles.calendarCard}>
                  <Text style={styles.calendarTitle}>{entry.title}</Text>
                  {entry.location ? <Text style={styles.calendarMeta}>{entry.location}</Text> : null}
                  {entry.description ? <Text style={styles.calendarDesc}>{entry.description}</Text> : null}
                </View>
              ))
            )}
          </View>
        ) : null}
      </ScrollView>

      <Pressable style={styles.fab} onPress={onOpenAdd}>
        <Ionicons name="add" size={30} color="#11141d" />
      </Pressable>

      <Modal visible={Boolean(selectedEvent)} animationType="slide" transparent onRequestClose={() => setSelectedEvent(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalBrand}>Event details</Text>
              <Pressable onPress={() => setSelectedEvent(null)}>
                <Ionicons name="close" size={20} color={colors.ink} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody}>
              {selectedEvent?.mediaType === "photo" && selectedEvent.mediaUrl ? (
                <Image source={{ uri: selectedEvent.mediaUrl }} style={styles.modalHero} />
              ) : null}
              {selectedEvent?.mediaType === "video" && selectedEvent.mediaUrl && Platform.OS === "web" ? (
                <video src={selectedEvent.mediaUrl} controls style={{ width: "100%", height: 220, borderRadius: 12 }} />
              ) : null}
              <Text style={styles.modalTitle}>{selectedEvent?.title || "Untitled event"}</Text>
              <Text style={styles.modalMeta}>
                {selectedEvent?.eventTypeName} • {selectedEvent?.eventDate}
                {selectedEvent?.location ? ` • ${selectedEvent.location}` : ""}
              </Text>
              <Text style={styles.modalCaption}>{selectedEvent?.caption}</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function getStyles(isDark: boolean) {
  const colors = isDark ? darkPalette : palette;
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: isDark ? "#0d1322" : "#f4f6fa" },
    topBar: {
      backgroundColor: colors.brand,
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    },
    selectorRow: {
      flex: 1,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    cityChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: "rgba(255,255,255,0.16)",
    },
    cityChipText: { color: "#fff", fontWeight: "800", fontSize: 14 },
    topActions: { flexDirection: "row", gap: 8 },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.16)",
    },
    tabRow: {
      flexDirection: "row",
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tab: { flex: 1, alignItems: "center", paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "transparent" },
    tabActive: { borderBottomColor: colors.brand },
    tabText: { fontSize: 11, fontWeight: "700", color: colors.inkSoft },
    tabTextActive: { color: colors.brand },
    content: { padding: 16, paddingBottom: 100, gap: 14 },
    loading: { color: colors.inkSoft, fontSize: 12 },
    section: { gap: 10 },
    sectionTitle: { fontSize: 18, fontWeight: "800", color: colors.ink },
    sectionHint: { fontSize: 12, color: colors.inkSoft },
    horizontalList: { paddingRight: 8 },
    empty: { color: colors.inkSoft, fontStyle: "italic" },
    galleryGroup: { gap: 8 },
    galleryDate: { fontSize: 15, fontWeight: "800", color: colors.ink },
    locationBlock: { gap: 8 },
    locationHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
    locationTitle: { fontSize: 13, fontWeight: "700", color: colors.inkSoft },
    galleryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
    galleryCard: {
      width: "47%",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      overflow: "hidden",
    },
    pressed: { opacity: 0.9 },
    galleryImage: { width: "100%", height: 110 },
    galleryFallback: {
      height: 110,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#1b2a46" : "#edf3ff",
    },
    galleryCardTitle: { paddingHorizontal: 8, paddingTop: 8, fontSize: 12, fontWeight: "700", color: colors.ink },
    galleryCostCenter: {
      paddingHorizontal: 8,
      fontSize: 10,
      fontWeight: "600",
      color: colors.inkSoft,
    },
    galleryApproved: {
      paddingHorizontal: 8,
      paddingBottom: 8,
      fontSize: 10,
      fontWeight: "700",
      color: colors.brand,
      textTransform: "uppercase",
    },
    calendarCard: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 12,
      gap: 4,
    },
    calendarTitle: { fontSize: 15, fontWeight: "800", color: colors.ink },
    calendarMeta: { fontSize: 12, color: colors.inkSoft },
    calendarDesc: { fontSize: 13, color: colors.ink, lineHeight: 20 },
    fab: {
      position: "absolute",
      right: 18,
      bottom: 24,
      width: 58,
      height: 58,
      borderRadius: 29,
      backgroundColor: palette.accent,
      alignItems: "center",
      justifyContent: "center",
      elevation: 6,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end",
    },
    modalSheet: {
      maxHeight: "88%",
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      backgroundColor: colors.surface,
      padding: 16,
    },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    modalBrand: { fontSize: 12, fontWeight: "800", color: colors.inkSoft, textTransform: "uppercase" },
    modalBody: { gap: 10, paddingBottom: 20, paddingTop: 10 },
    modalHero: { width: "100%", height: 240, borderRadius: 12 },
    modalTitle: { fontSize: 22, fontWeight: "800", color: colors.ink },
    modalMeta: { fontSize: 12, color: colors.inkSoft },
    modalCaption: { fontSize: 15, lineHeight: 24, color: colors.ink },
  });
}
