import { useMemo, useState } from "react";
import { Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDetectedCity } from "../hooks/useDetectedCity";
import type { City, CostCenter, EventItem, HubTab } from "../types/app";
import { darkPalette, palette } from "../theme/theme";
import { layout } from "../theme/layout";
import { sortCitiesWithDefaultFirst, sortEventsWithCityFirst } from "../utils/locationCity";

type CityPickerScreenProps = {
  cities: City[];
  costCenters: CostCenter[];
  events: EventItem[];
  userName: string;
  /** City currently used to filter the feed; null shows every city. */
  selectedCityId: string | null;
  onSelectCity: (city: City) => void;
  onClearCity: () => void;
  onOpenProfile?: () => void;
};

const CODE_TINTS = [
  { fg: "#c4242f", bg: "#fdeaec" },
  { fg: "#0f7a4d", bg: "#e3f6ec" },
  { fg: "#3b4fd6", bg: "#e8ecfd" },
  { fg: "#b45309", bg: "#fff1dc" },
  { fg: "#7a3bd6", bg: "#f1e8fd" },
  { fg: "#0e7490", bg: "#e0f5fa" },
];

function tintForCode(code: string) {
  let hash = 0;
  for (let i = 0; i < code.length; i += 1) hash = (hash * 31 + code.charCodeAt(i)) >>> 0;
  return CODE_TINTS[hash % CODE_TINTS.length];
}

function getCityIconSource(cityName: string) {
  const name = cityName.trim().toLowerCase();
  if (name === "mumbai") return require("../../assets/cities/mumbai.png");
  if (name === "pune") return require("../../assets/cities/pune.png");
  if (name === "nagpur") return require("../../assets/cities/nagpur-selected.png");
  return require("../../assets/cities/mumbai.png");
}

export function CityPickerScreen({
  cities,
  costCenters,
  events,
  userName,
  selectedCityId,
  onSelectCity,
  onClearCity,
}: CityPickerScreenProps) {
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<HubTab>("feed");
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const { detectedCity, detectedCityId, isDetecting, detect } = useDetectedCity(cities);
  const isDark = useColorScheme() === "dark";
  const styles = useMemo(() => getStyles(isDark), [isDark]);
  const colors = isDark ? darkPalette : palette;

  const filteredRaw = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return cities;

    const matchingCostCenterCityIds = new Set(
      costCenters
        .filter((cc) => cc.name.toLowerCase().includes(q) || cc.code.toLowerCase().includes(q))
        .map((cc) => cc.cityId)
    );
    const costCenterCityById = new Map(costCenters.map((cc) => [cc.id, cc.cityId] as const));
    const matchingEventCityIds = new Set(
      events
        .filter((event) => {
          const title = (event.title || "").toLowerCase();
          const location = (event.location || "").toLowerCase();
          const caption = (event.caption || "").toLowerCase();
          const centerName = (event.costCenterName || "").toLowerCase();
          const centerCode = (event.costCenterCode || "").toLowerCase();
          const uploaderName = (event.uploadedByName || "").toLowerCase();
          const uploaderEmail = (event.uploadedByEmail || "").toLowerCase();
          return (
            title.includes(q) ||
            location.includes(q) ||
            caption.includes(q) ||
            centerName.includes(q) ||
            centerCode.includes(q) ||
            uploaderName.includes(q) ||
            uploaderEmail.includes(q)
          );
        })
        .map((event) =>
          event.cityId || (event.costCenterId ? costCenterCityById.get(event.costCenterId) : null) || ""
        )
        .filter(Boolean)
    );

    return cities.filter((city) => {
      const cityMatches =
        city.name.toLowerCase().includes(q) || (city.state || "").toLowerCase().includes(q);
      return cityMatches || matchingCostCenterCityIds.has(city.id) || matchingEventCityIds.has(city.id);
    });
  }, [cities, costCenters, events, query]);

  const filtered = useMemo(
    () => sortCitiesWithDefaultFirst(filteredRaw, detectedCityId),
    [filteredRaw, detectedCityId]
  );

  const visibleCityIds = useMemo(() => new Set(filtered.map((city) => city.id)), [filtered]);
  const costCenterCityById = useMemo(
    () => new Map(costCenters.map((cc) => [cc.id, cc.cityId] as const)),
    [costCenters]
  );

  const scopedEvents = useMemo(
    () =>
      events.filter((event) => {
        if ((event.kind ?? "event") !== "event") return false;
        const eventCityId =
          event.cityId || (event.costCenterId ? costCenterCityById.get(event.costCenterId) : null) || null;
        if (!eventCityId || !visibleCityIds.has(eventCityId)) return false;
        return !selectedCityId || eventCityId === selectedCityId;
      }),
    [costCenterCityById, events, visibleCityIds, selectedCityId]
  );
  const sortByLocalFirst = (list: EventItem[]) =>
    sortEventsWithCityFirst(list, detectedCityId, costCenterCityById);

  const ongoingEvents = useMemo(
    () => sortByLocalFirst(scopedEvents.filter((event) => event.eventStatus === "ongoing")),
    [scopedEvents, detectedCityId, costCenterCityById]
  );
  const upcomingEvents = useMemo(
    () => sortByLocalFirst(scopedEvents.filter((event) => event.eventStatus === "upcoming")),
    [scopedEvents, detectedCityId, costCenterCityById]
  );
  const completedEvents = useMemo(
    () => sortByLocalFirst(scopedEvents.filter((event) => event.eventStatus === "complete")),
    [scopedEvents, detectedCityId, costCenterCityById]
  );
  const calendarGroups = useMemo(() => {
    const byDate = new Map<string, number>();
    scopedEvents.forEach((event) => {
      const count = byDate.get(event.eventDate) || 0;
      byDate.set(event.eventDate, count + 1);
    });
    return Array.from(byDate.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [scopedEvents]);
  const feedEvents = useMemo(
    () => sortByLocalFirst(scopedEvents),
    [scopedEvents, detectedCityId, costCenterCityById]
  );

  function formatCreatedAt(value?: string) {
    if (!value) return "Unknown upload time";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  }

  function renderDetailedEvents(list: EventItem[], emptyLabel: string) {
    if (!list.length) {
      return <Text style={styles.empty}>{emptyLabel}</Text>;
    }

    return (
      <View style={styles.cardsGrid}>
        {list.map((event) => {
          const tint = event.costCenterCode ? tintForCode(event.costCenterCode) : null;
          return (
            <Pressable
              key={event.id}
              style={({ pressed }) => [styles.thumbCard, pressed && styles.pressed]}
              onPress={() => setSelectedEvent(event)}
            >
              <View>
                {event.mediaType === "photo" && event.mediaUrl ? (
                  <Image source={{ uri: event.mediaUrl }} style={styles.thumbImage} />
                ) : event.mediaType === "video" && event.mediaUrl && Platform.OS === "web" ? (
                  <video src={event.mediaUrl} style={{ width: "100%", height: 124 }} />
                ) : (
                  <View style={styles.thumbFallback}>
                    <Ionicons name="videocam-outline" size={22} color={colors.brand} />
                  </View>
                )}
                {event.eventTypeName ? (
                  <View style={styles.typeBadge}>
                    <Text style={styles.typeBadgeText} numberOfLines={1}>
                      {event.eventTypeName}
                    </Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.thumbBody}>
                <Text style={styles.thumbTitle} numberOfLines={2}>
                  {event.title || "Untitled event"}
                </Text>
                <Text style={styles.thumbMeta} numberOfLines={1}>
                  {event.eventDate} • {event.location || event.cityName || "No location"}
                </Text>
                {tint ? (
                  <View style={[styles.codePill, { backgroundColor: tint.bg }]}>
                    <Text style={[styles.codePillText, { color: tint.fg }]} numberOfLines={1}>
                      {event.costCenterCode}
                    </Text>
                  </View>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScrollView
        style={styles.eventsWrap}
        contentContainerStyle={styles.eventsContent}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[2]}
      >
        <View style={styles.hero}>
          <Text style={styles.greeting}>Hi {userName.split(" ")[0]}, select your city</Text>
          <Text style={styles.subtitle}>Browse events and capture moments across Akanksha</Text>
        </View>

        <View>
          <View style={styles.searchWrap}>
            <Ionicons name="search" size={18} color={colors.inkSoft} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search by city, event, cost center..."
              placeholderTextColor={colors.inkSoft}
              style={styles.searchInput}
            />
            <Pressable onPress={() => void detect()} style={styles.detectBtn} disabled={isDetecting}>
              <Ionicons name="locate" size={18} color={colors.brand} />
            </Pressable>
          </View>

          {detectedCity ? (
            <View style={styles.locationBanner}>
              <Ionicons name="location" size={15} color={colors.brand} />
              <Text style={styles.locationBannerText}>
                Showing {detectedCity.name} events first based on your location
              </Text>
            </View>
          ) : isDetecting ? (
            <Text style={styles.locationHint}>Detecting your city...</Text>
          ) : null}

          <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>Cities</Text>
            <Pressable onPress={onClearCity} hitSlop={8}>
              <Text style={styles.viewAll}>View All</Text>
            </Pressable>
          </View>
          {filtered.length === 0 ? <Text style={styles.empty}>No cities found.</Text> : null}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cityRow}
          >
            {filtered.map((item) => {
              const isNearYou = item.id === detectedCityId;
              const isSelected = item.id === selectedCityId;
              return (
                <Pressable
                  key={item.id}
                  style={({ pressed }) => [
                    styles.cityTab,
                    isSelected && styles.cityTabSelected,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => onSelectCity(item)}
                >
                  <View style={[styles.cityIconWrap, isSelected && styles.cityIconWrapSelected]}>
                    <Image source={getCityIconSource(item.name)} style={styles.cityIconImage} resizeMode="contain" />
                  </View>
                  <View style={styles.cityTextWrap}>
                    <Text style={styles.cityTabText} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text
                      style={[styles.citySub, isNearYou && styles.citySubNear]}
                      numberOfLines={1}
                    >
                      {isNearYou ? "NEAR YOU" : item.state || "India"}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.tabBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.eventTabRow}>
            {(
              [
                { id: "feed", label: "Feed" },
                { id: "ongoing", label: "Ongoing" },
                { id: "upcoming", label: "Upcoming" },
                { id: "capture", label: "CaptureAkanksha" },
                { id: "calendar", label: "Calendar" },
              ] as Array<{ id: HubTab; label: string }>
            ).map((tab) => (
              <Pressable
                key={tab.id}
                style={[styles.eventTab, activeTab === tab.id && styles.eventTabActive]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Text style={[styles.eventTabText, activeTab === tab.id && styles.eventTabTextActive]}>
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <View style={styles.eventsBody}>

        {activeTab === "feed" ? (
          renderDetailedEvents(feedEvents, "No events found for selected cities.")
        ) : null}

        {activeTab === "ongoing" ? (
          renderDetailedEvents(ongoingEvents, "No ongoing events found for selected cities.")
        ) : null}

        {activeTab === "upcoming" ? (
          renderDetailedEvents(upcomingEvents, "No upcoming events found for selected cities.")
        ) : null}

        {activeTab === "capture" ? (
          renderDetailedEvents(completedEvents, "No completed events found for selected cities.")
        ) : null}

        {activeTab === "calendar" ? (
          calendarGroups.length ? (
            calendarGroups.map((entry) => (
              <View key={entry.date} style={styles.eventCard}>
                <Text style={styles.eventTitle}>{entry.date}</Text>
                <Text style={styles.eventMeta}>
                  {entry.count} event{entry.count > 1 ? "s" : ""}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.empty}>No calendar entries found for selected cities.</Text>
          )
        ) : null}
        </View>
      </ScrollView>

      <Modal visible={Boolean(selectedEvent)} transparent animationType="fade" onRequestClose={() => setSelectedEvent(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
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
                {selectedEvent?.eventTypeName}
                {selectedEvent?.costCenterCode ? ` • ${selectedEvent.costCenterCode}` : ""}
              </Text>
              <Text style={styles.modalCaption}>{selectedEvent?.caption || "No description provided."}</Text>
              <Text style={styles.modalMeta}>Date: {selectedEvent?.eventDate || "Not provided"}</Text>
              <Text style={styles.modalMeta}>Location: {selectedEvent?.location || "Not provided"}</Text>
              <Text style={styles.modalMeta}>City: {selectedEvent?.cityName || "Not provided"}</Text>
              <Text style={styles.modalMeta}>Cost Center: {selectedEvent?.costCenterName || "Not provided"}</Text>
              <Text style={styles.modalMeta}>Status: {selectedEvent?.eventStatus || "Not provided"}</Text>
              <Text style={styles.modalMeta}>Uploaded by: {selectedEvent?.uploadedByName || "Unknown user"}</Text>
              {selectedEvent?.uploadedByEmail ? (
                <Text style={styles.modalMeta}>Uploader email: {selectedEvent.uploadedByEmail}</Text>
              ) : null}
              <Text style={styles.modalMeta}>Uploaded on: {formatCreatedAt(selectedEvent?.createdAt)}</Text>
              <Text style={styles.modalMeta}>
                Gallery approved: {selectedEvent?.approvedForGallery ? "Yes" : "No"}
              </Text>
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
    hero: {
      paddingHorizontal: layout.screenPadding,
      paddingTop: 12,
      paddingBottom: 38,
      backgroundColor: colors.brand,
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
    },
    brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    brandDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#3ddc97" },
    brand: {
      color: "#fff",
      fontSize: 12,
      fontWeight: "800",
      letterSpacing: 1.2,
      textTransform: "uppercase",
    },
    greeting: { color: "#fff", fontSize: 24, fontWeight: "800", marginTop: 10, lineHeight: 30 },
    subtitle: { color: "rgba(255,255,255,0.9)", fontSize: 13, marginTop: 4 },
    searchWrap: {
      marginHorizontal: layout.screenPadding,
      marginTop: -24,
      borderRadius: 16,
      backgroundColor: colors.surface,
      minHeight: 48,
      paddingLeft: 14,
      paddingRight: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    searchInput: { flex: 1, fontSize: 14, color: colors.ink, paddingVertical: 8 },
    detectBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#1a2640" : "#fff0f1",
    },
    locationBanner: {
      marginHorizontal: layout.screenPadding,
      marginTop: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? "#4a2230" : "#ffd6db",
      backgroundColor: isDark ? "rgba(255, 90, 106, 0.12)" : "#fff1f2",
      paddingHorizontal: 12,
      paddingVertical: 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    locationBannerText: {
      flex: 1,
      fontSize: 12,
      fontWeight: "700",
      color: isDark ? "#ffc4cb" : colors.brand,
      lineHeight: 17,
    },
    locationHint: { marginHorizontal: layout.screenPadding, marginTop: 8, fontSize: 12, color: colors.inkSoft },
    sectionRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: 14,
      marginBottom: 8,
      marginHorizontal: layout.screenPadding,
    },
    sectionTitle: {
      fontSize: 12,
      fontWeight: "800",
      color: colors.inkSoft,
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    viewAll: { fontSize: 13, fontWeight: "800", color: colors.brand },
    cityRow: { paddingHorizontal: layout.screenPadding, gap: 10, paddingBottom: 4 },
    cityTab: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      minWidth: 132,
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    cityTabSelected: {
      borderColor: colors.brand,
      backgroundColor: isDark ? "#2a1820" : "#fff7f8",
    },
    cityIconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#1c2a45" : "#f1f3f8",
    },
    cityIconWrapSelected: { backgroundColor: isDark ? "#4a2230" : "#ffe7ea" },
    cityIconImage: { width: 22, height: 22 },
    cityTextWrap: { flexShrink: 1 },
    cityTabText: { fontSize: 14, fontWeight: "800", color: colors.ink },
    citySub: { fontSize: 10, fontWeight: "700", color: colors.inkSoft, marginTop: 1 },
    citySubNear: { color: colors.brand, letterSpacing: 0.5 },
    pressed: { opacity: 0.9 },
    empty: { textAlign: "center", color: colors.inkSoft, marginTop: 24 },
    tabBar: {
      marginTop: 12,
      backgroundColor: isDark ? "#0d1322" : "#f4f6fa",
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    eventTabRow: { paddingHorizontal: layout.screenPadding - 4 },
    eventTab: {
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 14,
      borderBottomWidth: 3,
      borderBottomColor: "transparent",
    },
    eventTabActive: { borderBottomColor: colors.brand },
    eventTabText: { fontSize: 14, fontWeight: "700", color: colors.inkSoft },
    eventTabTextActive: { color: colors.brand },
    eventsWrap: { flex: 1 },
    eventsContent: { paddingBottom: 24 },
    eventsBody: { paddingHorizontal: layout.screenPadding, paddingTop: 14, gap: 10 },
    eventCard: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 12,
      gap: 4,
    },
    eventTitle: { fontSize: 14, fontWeight: "700", color: colors.ink },
    eventMeta: { fontSize: 12, color: colors.inkSoft },
    cardsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      rowGap: 12,
    },
    thumbCard: {
      width: "48.5%",
      borderRadius: 16,
      backgroundColor: colors.surface,
      overflow: "hidden",
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    thumbImage: { width: "100%", height: 124, backgroundColor: isDark ? "#1f304f" : "#e8edf8" },
    thumbFallback: {
      width: "100%",
      height: 124,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#1b2a46" : "#edf3ff",
    },
    typeBadge: {
      position: "absolute",
      left: 8,
      top: 8,
      maxWidth: "80%",
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
      backgroundColor: "rgba(17,20,29,0.72)",
    },
    typeBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
    thumbBody: { padding: 10, gap: 4 },
    thumbTitle: { fontSize: 14, fontWeight: "800", color: colors.ink, lineHeight: 18, minHeight: 36 },
    thumbMeta: { fontSize: 11, color: colors.inkSoft },
    codePill: { alignSelf: "flex-start", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginTop: 2 },
    codePillText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
    },
    modalCard: {
      width: "100%",
      maxWidth: 680,
      maxHeight: "88%",
      borderRadius: 16,
      backgroundColor: colors.surface,
      padding: 14,
    },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    modalBrand: { fontSize: 12, fontWeight: "800", color: colors.inkSoft, textTransform: "uppercase" },
    modalBody: { gap: 8, paddingTop: 10, paddingBottom: 12 },
    modalHero: { width: "100%", height: 220, borderRadius: 12 },
    modalTitle: { fontSize: 20, fontWeight: "800", color: colors.ink },
    modalMeta: { fontSize: 12, color: colors.inkSoft },
    modalCaption: { fontSize: 14, color: colors.ink, lineHeight: 22 },
  });
}
