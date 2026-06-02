import { useMemo, useState } from "react";
import { Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDetectedCity } from "../hooks/useDetectedCity";
import type { City, CostCenter, EventItem, HubTab } from "../types/app";
import { darkPalette, palette } from "../theme/theme";
import { sortCitiesWithDefaultFirst, sortEventsWithCityFirst } from "../utils/locationCity";

type CityPickerScreenProps = {
  cities: City[];
  costCenters: CostCenter[];
  events: EventItem[];
  userName: string;
  onSelectCity: (city: City) => void;
  onOpenProfile?: () => void;
};

function getCityIconSource(cityName: string) {
  const name = cityName.trim().toLowerCase();
  if (name === "mumbai") return require("../../assets/cities/mumbai.png");
  if (name === "pune") return require("../../assets/cities/pune.png");
  if (name === "nagpur") return require("../../assets/cities/nagpur.png");
  return require("../../assets/cities/mumbai.png");
}

export function CityPickerScreen({
  cities,
  costCenters,
  events,
  userName,
  onSelectCity,
  onOpenProfile,
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
        const eventCityId =
          event.cityId || (event.costCenterId ? costCenterCityById.get(event.costCenterId) : null) || null;
        return Boolean(eventCityId && visibleCityIds.has(eventCityId));
      }),
    [costCenterCityById, events, visibleCityIds]
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
        {list.map((event) => (
          <Pressable
            key={event.id}
            style={({ pressed }) => [styles.thumbCard, pressed && styles.pressed]}
            onPress={() => setSelectedEvent(event)}
          >
            {event.mediaType === "photo" && event.mediaUrl ? (
              <Image source={{ uri: event.mediaUrl }} style={styles.thumbImage} />
            ) : event.mediaType === "video" && event.mediaUrl && Platform.OS === "web" ? (
              <video src={event.mediaUrl} style={{ width: "100%", height: 120 }} />
            ) : (
              <View style={styles.thumbFallback}>
                <Ionicons name="videocam-outline" size={18} color={colors.brand} />
              </View>
            )}
            <View style={styles.thumbBody}>
              <Text style={styles.thumbTitle} numberOfLines={2}>
                {event.title || "Untitled event"}
              </Text>
              <Text style={styles.thumbMeta} numberOfLines={1}>
                {event.eventDate} • {event.location || "No location"}
              </Text>
              <Text style={styles.thumbMeta} numberOfLines={1}>
                {event.eventTypeName}
                {event.costCenterCode ? ` • ${event.costCenterCode}` : ""}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.hero}>
        <View style={styles.heroTopRow}>
          <Text style={styles.brand}>CaptureAkanksha</Text>
          {onOpenProfile ? (
            <Pressable style={styles.profileBtn} onPress={onOpenProfile}>
              <Ionicons name="person-circle-outline" size={22} color="#fff" />
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.greeting}>Hi {userName.split(" ")[0]}, select your city</Text>
        <Text style={styles.subtitle}>Then choose a cost center to view and capture events</Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={18} color={colors.inkSoft} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by city, event, cost center, or user"
          placeholderTextColor={colors.inkSoft}
          style={styles.searchInput}
        />
        <Pressable onPress={() => void detect()} style={styles.detectBtn} disabled={isDetecting}>
          <Ionicons name="locate" size={18} color={colors.brand} />
        </Pressable>
      </View>

      {detectedCity ? (
        <View style={styles.locationBanner}>
          <Ionicons name="navigate" size={14} color={colors.brand} />
          <Text style={styles.locationBannerText}>
            Showing {detectedCity.name} events first based on your location
          </Text>
        </View>
      ) : isDetecting ? (
        <Text style={styles.locationHint}>Detecting your city...</Text>
      ) : null}

      <Text style={styles.sectionTitle}>Cities</Text>
      {filtered.length === 0 ? <Text style={styles.empty}>No cities found.</Text> : null}
      <ScrollView
        horizontal
        style={styles.cityRowScroll}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabRow}
      >
        {filtered.map((item) => {
          const isNearYou = item.id === detectedCityId;
          return (
            <Pressable
              key={item.id}
              style={({ pressed }) => [
                styles.cityTab,
                isNearYou && styles.cityTabNearYou,
                pressed && styles.pressed,
              ]}
              onPress={() => onSelectCity(item)}
            >
              <View style={styles.cityTabInner}>
                <View style={[styles.cityIconWrap, isNearYou && styles.cityIconWrapNearYou]}>
                  <Image source={getCityIconSource(item.name)} style={styles.cityIconImage} resizeMode="contain" />
                </View>
                <Text style={[styles.cityTabText, isNearYou && styles.cityTabTextNearYou]} numberOfLines={1}>
                  {item.name}
                </Text>
                {isNearYou ? <Text style={styles.nearYouBadge}>Near you</Text> : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.eventTabRow}>
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
      </View>

      <ScrollView style={styles.eventsWrap} contentContainerStyle={styles.eventsContent}>
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
      paddingHorizontal: 18,
      paddingTop: 8,
      paddingBottom: 14,
      backgroundColor: colors.brand,
      borderBottomLeftRadius: 22,
      borderBottomRightRadius: 22,
    },
    brand: {
      color: "#fff",
      fontSize: 13,
      fontWeight: "800",
      letterSpacing: 1,
      textTransform: "uppercase",
    },
    heroTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    profileBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.16)",
    },
    greeting: {
      color: "#fff",
      fontSize: 24,
      fontWeight: "800",
      marginTop: 8,
    },
    subtitle: {
      color: "rgba(255,255,255,0.88)",
      fontSize: 13,
      marginTop: 4,
    },
    searchWrap: {
      marginHorizontal: 18,
      marginTop: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      minHeight: 52,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    searchInput: { flex: 1, fontSize: 15, color: colors.ink },
    detectBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#1a2640" : "#fff0f1",
    },
    locationBanner: {
      marginHorizontal: 18,
      marginTop: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? "#3a2f14" : "#ffd6db",
      backgroundColor: isDark ? "rgba(255, 90, 106, 0.12)" : "#fff1f2",
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    locationBannerText: {
      flex: 1,
      fontSize: 12,
      fontWeight: "700",
      color: isDark ? "#ffc4cb" : colors.brand,
      lineHeight: 18,
    },
    locationHint: {
      marginHorizontal: 18,
      marginTop: 8,
      fontSize: 12,
      color: colors.inkSoft,
    },
    sectionTitle: {
      marginTop: 6,
      marginHorizontal: 18,
      fontSize: 13,
      fontWeight: "800",
      color: colors.inkSoft,
      textTransform: "uppercase",
      letterSpacing: 0.8,
    },
    tabRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 18,
      paddingTop: 0,
      paddingBottom: 0,
      gap: 12,
      minWidth: "100%",
    },
    cityRowScroll: {
      minHeight: 86,
    },
    cityTab: {
      minWidth: 110,
      flexShrink: 0,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    cityTabNearYou: {
      borderColor: colors.brand,
      backgroundColor: isDark ? "#2a1820" : "#fff7f8",
    },
    cityTabInner: {
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
    },
    cityIconWrap: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#1c2a45" : "#fff3f4",
    },
    cityIconWrapNearYou: {
      backgroundColor: isDark ? "#4a2230" : "#ffe7ea",
    },
    cityIconImage: { width: 16, height: 16 },
    pressed: { opacity: 0.9 },
    cityTabText: {
      fontSize: 13,
      fontWeight: "700",
      color: colors.ink,
      textAlign: "center",
    },
    cityTabTextNearYou: {
      color: colors.brand,
    },
    nearYouBadge: {
      fontSize: 10,
      fontWeight: "800",
      color: colors.brand,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    empty: { textAlign: "center", color: colors.inkSoft, marginTop: 24 },
    eventTabRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      backgroundColor: colors.surface,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    eventTab: {
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderBottomWidth: 2,
      borderBottomColor: "transparent",
    },
    eventTabActive: { borderBottomColor: colors.brand },
    eventTabText: { fontSize: 11, fontWeight: "700", color: colors.inkSoft },
    eventTabTextActive: { color: colors.brand },
    eventsWrap: {},
    eventsContent: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 20, gap: 10 },
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
    thumbCard: {
      width: "48%",
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      overflow: "hidden",
    },
    cardsGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      gap: 10,
    },
    thumbImage: { width: "100%", height: 120, backgroundColor: isDark ? "#1f304f" : "#e8edf8" },
    thumbFallback: {
      width: "100%",
      height: 120,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#1b2a46" : "#edf3ff",
    },
    thumbBody: { paddingHorizontal: 12, paddingVertical: 10, gap: 4, flex: 1 },
    thumbTitle: { fontSize: 14, fontWeight: "800", color: colors.ink },
    thumbMeta: { fontSize: 11, color: colors.inkSoft },
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
