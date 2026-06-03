import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  createCityAdmin,
  deleteCalendarEntry,
  fetchAdminCalendar,
  fetchAdminEvents,
  fetchAllCitiesAdmin,
  fetchAllCostCentersAdmin,
  moderateEvent,
  notifyEventDonors,
  upsertCalendarEntry,
} from "../services/api";
import { filterAllowedCities } from "../config/cities";
import type { CalendarEntry, City, CostCenter, EventItem, EventStatus } from "../types/app";
import { darkPalette, palette } from "../theme/theme";
import { groupCostCentersByCity } from "../utils/costCenterGrouping";

type AdminScreenProps = {
  token: string;
  onClose: () => void;
};

type AdminTab = "events" | "calendar" | "cities";

export function AdminScreen({ token, onClose }: AdminScreenProps) {
  const [tab, setTab] = useState<AdminTab>("events");
  const [events, setEvents] = useState<EventItem[]>([]);
  const [calendar, setCalendar] = useState<CalendarEntry[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [newCityName, setNewCityName] = useState("");
  const [newCityState, setNewCityState] = useState("");
  const [calendarTitle, setCalendarTitle] = useState("");
  const [calendarDate, setCalendarDate] = useState(new Date().toISOString().slice(0, 10));
  const [calendarLocation, setCalendarLocation] = useState("");
  const [calendarCostCenterId, setCalendarCostCenterId] = useState("");
  const isDark = useColorScheme() === "dark";
  const styles = useMemo(() => getStyles(isDark), [isDark]);
  const colors = isDark ? darkPalette : palette;
  const costCenterSections = useMemo(() => groupCostCentersByCity(costCenters), [costCenters]);

  async function refresh() {
    const [adminEvents, adminCalendar, adminCities, adminCostCenters] = await Promise.all([
      fetchAdminEvents(token),
      fetchAdminCalendar(token),
      fetchAllCitiesAdmin(token),
      fetchAllCostCentersAdmin(token),
    ]);
    setEvents(adminEvents);
    setCalendar(adminCalendar);
    setCities(filterAllowedCities(adminCities));
    setCostCenters(adminCostCenters);
    if (!calendarCostCenterId && adminCostCenters[0]) {
      setCalendarCostCenterId(adminCostCenters[0].id);
    }
  }

  useEffect(() => {
    void refresh().catch((error) => Alert.alert("Admin load failed", (error as Error).message));
  }, [token]);

  async function updateEvent(eventId: string, patch: {
    eventStatus?: EventStatus;
    approvedForGallery?: boolean;
    cityId?: string | null;
  }) {
    try {
      await moderateEvent({ token, eventId, ...patch });
      await refresh();
    } catch (error) {
      Alert.alert("Update failed", (error as Error).message);
    }
  }

  async function handleCreateCity() {
    if (!newCityName.trim()) {
      Alert.alert("Missing city", "Enter a city name.");
      return;
    }
    try {
      await createCityAdmin({ token, name: newCityName.trim(), state: newCityState.trim() || undefined });
      setNewCityName("");
      setNewCityState("");
      await refresh();
    } catch (error) {
      Alert.alert("Create city failed", (error as Error).message);
    }
  }

  async function handleNotifyDonors(eventId: string) {
    try {
      const result = await notifyEventDonors(token, eventId);
      Alert.alert("Donors notified", `Queued updates for ${result.notifiedCount} donor(s).`);
    } catch (error) {
      Alert.alert("Notify failed", (error as Error).message);
    }
  }

  async function handleCreateCalendarEntry() {
    if (!calendarTitle.trim() || !calendarCostCenterId) {
      Alert.alert("Missing fields", "Title and cost center are required.");
      return;
    }
    const center = costCenters.find((c) => c.id === calendarCostCenterId);
    try {
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
      await refresh();
    } catch (error) {
      Alert.alert("Calendar save failed", (error as Error).message);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={onClose}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Admin Console</Text>
        <Pressable onPress={() => void refresh()}>
          <Ionicons name="refresh" size={20} color={colors.brand} />
        </Pressable>
      </View>

      <View style={styles.tabRow}>
        {(["events", "calendar", "cities"] as AdminTab[]).map((item) => (
          <Pressable key={item} style={[styles.tab, tab === item && styles.tabActive]} onPress={() => setTab(item)}>
            <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>
              {item === "events" ? "Content" : item === "calendar" ? "Calendar" : "Cities"}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {tab === "events" ? (
          events.map((event) => (
            <View key={event.id} style={styles.card}>
              <Text style={styles.cardTitle}>{event.title || "Untitled"}</Text>
              <Text style={styles.cardMeta}>
                {event.eventTypeName} • {event.eventStatus} • {event.costCenterCode || "No CC"} • {event.eventDate}
              </Text>
              <Text style={styles.cardCaption} numberOfLines={2}>
                {event.caption}
              </Text>
              <View style={styles.actionRow}>
                <Pressable style={styles.chip} onPress={() => void updateEvent(event.id, { eventStatus: "ongoing" })}>
                  <Text style={styles.chipText}>Ongoing</Text>
                </Pressable>
                <Pressable style={styles.chip} onPress={() => void updateEvent(event.id, { eventStatus: "upcoming" })}>
                  <Text style={styles.chipText}>Upcoming</Text>
                </Pressable>
                <Pressable style={styles.chip} onPress={() => void updateEvent(event.id, { eventStatus: "complete" })}>
                  <Text style={styles.chipText}>Complete</Text>
                </Pressable>
                <Pressable
                  style={[styles.chip, event.approvedForGallery && styles.chipActive]}
                  onPress={() =>
                    void updateEvent(event.id, { approvedForGallery: !event.approvedForGallery, eventStatus: "complete" })
                  }
                >
                  <Text style={[styles.chipText, event.approvedForGallery && styles.chipTextActive]}>
                    {event.approvedForGallery ? "Approved" : "Approve gallery"}
                  </Text>
                </Pressable>
                <Pressable style={styles.chip} onPress={() => void handleNotifyDonors(event.id)}>
                  <Text style={styles.chipText}>Notify donors</Text>
                </Pressable>
              </View>
            </View>
          ))
        ) : null}

        {tab === "calendar" ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Add calendar event</Text>
            <TextInput style={styles.field} value={calendarTitle} onChangeText={setCalendarTitle} placeholder="Title" placeholderTextColor={colors.inkSoft} />
            <TextInput style={styles.field} value={calendarDate} onChangeText={setCalendarDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.inkSoft} />
            <TextInput style={styles.field} value={calendarLocation} onChangeText={setCalendarLocation} placeholder="Location" placeholderTextColor={colors.inkSoft} />
            <Text style={styles.fieldLabel}>Cost center</Text>
            {costCenterSections.map((section) => (
              <View key={section.cityId} style={styles.ccCityGroup}>
                <View style={styles.ccCityHeader}>
                  <Ionicons name="business" size={16} color={colors.brand} />
                  <Text style={styles.ccCityTitle}>{section.cityName}</Text>
                </View>
                <View style={styles.ccChipRow}>
                  {section.data.map((item) => (
                    <Pressable
                      key={item.id}
                      style={[styles.chip, calendarCostCenterId === item.id && styles.chipActive]}
                      onPress={() => setCalendarCostCenterId(item.id)}
                    >
                      <Ionicons
                        name="grid"
                        size={14}
                        color={calendarCostCenterId === item.id ? "#fff" : colors.inkSoft}
                      />
                      <Text style={[styles.chipText, calendarCostCenterId === item.id && styles.chipTextActive]}>
                        {item.code}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
            <Pressable style={styles.primaryBtn} onPress={() => void handleCreateCalendarEntry()}>
              <Text style={styles.primaryBtnText}>Save calendar entry</Text>
            </Pressable>

            {calendar.map((entry) => (
              <View key={entry.id} style={styles.card}>
                <Text style={styles.cardTitle}>{entry.title}</Text>
                <Text style={styles.cardMeta}>
                  {entry.costCenterCode || entry.costCenterName} • {entry.eventDate}{" "}
                  {entry.location ? `• ${entry.location}` : ""}
                </Text>
                <Pressable
                  style={styles.dangerBtn}
                  onPress={() =>
                    void deleteCalendarEntry(token, entry.id)
                      .then(refresh)
                      .catch((error) => Alert.alert("Delete failed", (error as Error).message))
                  }
                >
                  <Text style={styles.dangerBtnText}>Delete</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}

        {tab === "cities" ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Add city</Text>
            <TextInput style={styles.field} value={newCityName} onChangeText={setNewCityName} placeholder="City name" placeholderTextColor={colors.inkSoft} />
            <TextInput style={styles.field} value={newCityState} onChangeText={setNewCityState} placeholder="State" placeholderTextColor={colors.inkSoft} />
            <Pressable style={styles.primaryBtn} onPress={() => void handleCreateCity()}>
              <Text style={styles.primaryBtnText}>Create city</Text>
            </Pressable>
            {cities.map((city) => (
              <View key={city.id} style={styles.card}>
                <View style={styles.cityTitleRow}>
                  <View style={styles.cityIcon}>
                    <Ionicons name="business" size={18} color={colors.brand} />
                  </View>
                  <Text style={styles.cardTitle}>{city.name}</Text>
                </View>
                <Text style={styles.cardMeta}>
                  {city.state || "—"} • {city.isActive ? "Active" : "Inactive"}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function getStyles(isDark: boolean) {
  const colors = isDark ? darkPalette : palette;
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: isDark ? "#0d1322" : "#f4f6fa" },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    headerTitle: { fontSize: 16, fontWeight: "800", color: colors.ink },
    tabRow: { flexDirection: "row", backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
    tab: { flex: 1, alignItems: "center", paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: "transparent" },
    tabActive: { borderBottomColor: colors.brand },
    tabText: { fontSize: 12, fontWeight: "700", color: colors.inkSoft },
    tabTextActive: { color: colors.brand },
    content: { padding: 14, gap: 10, paddingBottom: 30 },
    section: { gap: 10 },
    sectionTitle: { fontSize: 15, fontWeight: "800", color: colors.ink },
    field: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 12,
      color: colors.ink,
    },
    card: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 12,
      gap: 6,
    },
    cityTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    cityIcon: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#1f2b46" : "#fff0f1",
    },
    cardTitle: { fontSize: 15, fontWeight: "800", color: colors.ink },
    cardMeta: { fontSize: 12, color: colors.inkSoft },
    cardCaption: { fontSize: 13, color: colors.ink },
    actionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: isDark ? "#1a2640" : "#f2f5fb",
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    chipActive: { borderColor: colors.brand, backgroundColor: isDark ? "#3a2230" : "#ffe8ea" },
    chipText: { fontSize: 11, fontWeight: "700", color: colors.inkSoft },
    chipTextActive: { color: colors.brand },
    fieldLabel: { fontSize: 12, fontWeight: "700", color: colors.inkSoft, textTransform: "uppercase" },
    ccCityGroup: { gap: 8, marginTop: 4 },
    ccCityHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
    ccCityTitle: { fontSize: 13, fontWeight: "800", color: colors.ink },
    ccChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    primaryBtn: {
      borderRadius: 12,
      backgroundColor: colors.brand,
      alignItems: "center",
      paddingVertical: 12,
    },
    primaryBtnText: { color: "#fff", fontWeight: "800" },
    dangerBtn: {
      alignSelf: "flex-start",
      borderRadius: 8,
      backgroundColor: "#ffe8ea",
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    dangerBtnText: { color: colors.brand, fontWeight: "700", fontSize: 12 },
  });
}
