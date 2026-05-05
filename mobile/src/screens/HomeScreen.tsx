import { useEffect, useMemo, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import {
  Alert,
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppButton, AppCard, ScreenHeader, SelectChip } from "../components";
import { polishEventDescription } from "../services/api";
import type { EventItem, EventType, MediaMode, SelectedMedia, User } from "../types/app";

type HomeScreenProps = {
  token: string;
  user: User;
  eventTypes: EventType[];
  groupedEvents: Record<string, Record<string, EventItem[]>>;
  selectedTypeId: string;
  eventTitle: string;
  caption: string;
  eventDate: string;
  mediaType: MediaMode;
  media: SelectedMedia;
  isLoading: boolean;
  onLogout: () => void;
  onSelectMediaType: (next: MediaMode) => void;
  onSelectType: (typeId: string) => void;
  onChangeEventDate: (next: string) => void;
  onChangeEventTitle: (next: string) => void;
  onChangeCaption: (next: string) => void;
  onCaptureMedia: () => void;
  onSaveEvent: () => void;
};

type HomeTab = "add" | "view" | "profile";

export function HomeScreen(props: HomeScreenProps) {
  const {
    token,
    user,
    eventTypes,
    groupedEvents,
    selectedTypeId,
    eventTitle,
    caption,
    eventDate,
    mediaType,
    media,
    isLoading,
    onLogout,
    onSelectMediaType,
    onSelectType,
    onChangeEventDate,
    onChangeEventTitle,
    onChangeCaption,
    onCaptureMedia,
    onSaveEvent,
  } = props;
  const [activeTab, setActiveTab] = useState<HomeTab>("add");
  const [eventTime, setEventTime] = useState("--:-- --");
  const [location, setLocation] = useState("");
  const [attendees, setAttendees] = useState("");
  const [isPolishing, setIsPolishing] = useState(false);
  const [polishCooldownUntil, setPolishCooldownUntil] = useState(0);
  const [likedEventIds, setLikedEventIds] = useState<Record<string, boolean>>({});
  const groupedEventEntries = useMemo(() => Object.entries(groupedEvents), [groupedEvents]);
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const styles = useMemo(() => getStyles(isDark), [isDark]);
  const isPolishCooldownActive = Date.now() < polishCooldownUntil;

  useEffect(() => {
    if (!polishCooldownUntil) {
      return;
    }
    const remainingMs = polishCooldownUntil - Date.now();
    if (remainingMs <= 0) {
      setPolishCooldownUntil(0);
      return;
    }
    const timeout = setTimeout(() => setPolishCooldownUntil(0), remainingMs);
    return () => clearTimeout(timeout);
  }, [polishCooldownUntil]);

  function toggleLike(eventId: string) {
    setLikedEventIds((current) => ({ ...current, [eventId]: !current[eventId] }));
  }

  async function handlePolishDescription() {
    const now = Date.now();
    if (isPolishCooldownActive) {
      const waitSeconds = Math.max(1, Math.ceil((polishCooldownUntil - now) / 1000));
      Alert.alert("Please wait", `Try polishing again in ${waitSeconds}s.`);
      return;
    }

    try {
      setIsPolishing(true);
      const polished = await polishEventDescription({ token, description: caption });
      onChangeCaption(polished);
    } catch (error) {
      const message = (error as Error).message;
      if (message.toLowerCase().includes("rate limit")) {
        setPolishCooldownUntil(Date.now() + 20_000);
      }
      Alert.alert("Polish failed", message);
    } finally {
      setIsPolishing(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title={`Welcome, ${user.name}`}
          subtitle="Capture quickly, browse cleanly"
        />
        <Text style={styles.modeHint}>
          {activeTab === "add" ? "Create" : activeTab === "view" ? "Activity" : "Profile"}
        </Text>

        {activeTab === "add" ? (
          <AppCard>
            <View style={styles.titleRow}>
              <Text style={styles.sectionHeading}>New Event</Text>
              <Pressable
                style={({ pressed }) => [styles.clearButton, pressed && styles.navIconPressed]}
                onPress={() => {
                  onChangeEventTitle("");
                  setLocation("");
                  setAttendees("");
                  onChangeCaption("");
                  onSelectMediaType("photo");
                }}
              >
                <Text style={styles.clearButtonText}>Clear</Text>
              </Pressable>
            </View>

            <View style={styles.inputShell}>
              <TextInput
                style={styles.eventTitleInput}
                placeholder="Event Title..."
                placeholderTextColor={isDark ? "#596178" : "#7b8399"}
                value={eventTitle}
                onChangeText={onChangeEventTitle}
              />
            </View>

            <View style={styles.descriptionCard}>
              <View style={styles.descriptionTopRow}>
                <Text style={styles.descriptionLabel}>Description</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.polishButton,
                    (isPolishing || !caption.trim() || isPolishCooldownActive) && styles.polishButtonDisabled,
                    pressed && styles.navIconPressed,
                  ]}
                  onPress={() => void handlePolishDescription()}
                  disabled={isPolishing || !caption.trim() || isPolishCooldownActive}
                >
                  <Ionicons name="sparkles-outline" size={14} color="#f0be1b" />
                  <Text style={styles.polishButtonText}>{isPolishing ? "Polishing..." : "Polish"}</Text>
                </Pressable>
              </View>
              <TextInput
                style={styles.descriptionInput}
                placeholder="What's this event about? Describe the details..."
                placeholderTextColor={isDark ? "#596178" : "#7b8399"}
                value={caption}
                onChangeText={onChangeCaption}
                multiline
              />
            </View>

            <View style={styles.mediaCard}>
              <View style={styles.mediaTopRow}>
                <Text style={styles.mediaHeading}>Media Attachments</Text>
                <View style={styles.row}>
                  <SelectChip
                    label="Photo"
                    iconName="camera-outline"
                    isActive={mediaType === "photo"}
                    onPress={() => onSelectMediaType("photo")}
                  />
                  <SelectChip
                    label="Video"
                    iconName="videocam-outline"
                    isActive={mediaType === "video"}
                    onPress={() => onSelectMediaType("video")}
                  />
                </View>
              </View>
              <Pressable style={styles.captureHint} onPress={onCaptureMedia}>
                <Text style={styles.captureHintText}>
                  {media ? `Selected: ${media.fileName || "Captured media"}` : "Capture photos or videos to attach."}
                </Text>
              </Pressable>
            </View>

            <View style={styles.dateTimeRow}>
              <View style={styles.infoPill}>
                <Ionicons name="calendar-outline" size={18} color="#f0be1b" />
                <TextInput
                  style={styles.pillInput}
                  value={eventDate}
                  onChangeText={onChangeEventDate}
                  placeholder="dd/mm/yyyy"
                  placeholderTextColor={isDark ? "#596178" : "#7b8399"}
                />
              </View>
              <View style={styles.infoPill}>
                <Ionicons name="time-outline" size={18} color="#f0be1b" />
                <TextInput
                  style={styles.pillInput}
                  value={eventTime}
                  onChangeText={setEventTime}
                  placeholder="--:-- --"
                  placeholderTextColor={isDark ? "#596178" : "#7b8399"}
                />
              </View>
            </View>

            <View style={styles.inputShell}>
              <Ionicons name="location-outline" size={20} color="#f0be1b" />
              <TextInput
                style={styles.inlineInput}
                placeholder="Location or Virtual Link"
                placeholderTextColor={isDark ? "#596178" : "#7b8399"}
                value={location}
                onChangeText={setLocation}
              />
            </View>

            <View style={styles.inputShell}>
              <Ionicons name="people-outline" size={20} color="#f0be1b" />
              <TextInput
                style={styles.inlineInput}
                placeholder="Add attendee & press Enter..."
                placeholderTextColor={isDark ? "#596178" : "#7b8399"}
                value={attendees}
                onChangeText={setAttendees}
              />
            </View>

            <Text style={styles.sectionLabel}>Event Type</Text>
            <FlatList
              horizontal
              data={eventTypes}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <SelectChip
                  label={item.name}
                  isActive={selectedTypeId === item.id}
                  onPress={() => onSelectType(item.id)}
                />
              )}
              contentContainerStyle={styles.listRow}
            />

            <View style={styles.actionRow}>
              <Pressable style={styles.saveDraftBtn}>
                <Text style={styles.saveDraftText}>Save Draft</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.submitBtn, pressed && styles.navIconPressed]}
                onPress={onSaveEvent}
                disabled={isLoading}
              >
                <Text style={styles.submitText}>{isLoading ? "Uploading..." : "Final Submit"}</Text>
                <Ionicons name="paper-plane-outline" size={17} color="#11141d" />
              </Pressable>
            </View>

            <AppButton
              label={media ? "Retake Camera Capture" : "Open Camera"}
              variant="muted"
              iconName="camera-outline"
              onPress={onCaptureMedia}
            />
          </AppCard>
        ) : activeTab === "view" ? (
          <AppCard>
            <Text style={styles.sectionHeading}>View Events</Text>
            <Text style={styles.helperText}>Grouped by event type and date.</Text>
            {groupedEventEntries.length === 0 ? (
              <Text style={styles.emptyText}>No events uploaded yet.</Text>
            ) : (
              groupedEventEntries.map(([typeName, byDate]) => (
                <View key={typeName} style={styles.group}>
                  <Text style={styles.groupTitle}>{typeName}</Text>
                  {Object.entries(byDate).map(([date, dateEvents]) => (
                    <View key={`${typeName}-${date}`} style={styles.dateBlock}>
                      <Text style={styles.dateTitle}>{date}</Text>
                      {dateEvents.map((event) => {
                        const isLiked = Boolean(likedEventIds[event.id]);
                        return (
                          <View key={event.id} style={styles.eventCard}>
                            {event.mediaType === "photo" && Boolean(event.mediaUrl) ? (
                              <Image source={{ uri: event.mediaUrl }} style={styles.eventImage} resizeMode="cover" />
                            ) : null}
                            {event.mediaType === "video" && Boolean(event.mediaUrl) ? (
                              Platform.OS === "web" ? (
                                <video
                                  src={event.mediaUrl}
                                  controls
                                  preload="metadata"
                                  style={styles.eventVideoWeb}
                                />
                              ) : (
                                <View style={styles.eventVideoFallback}>
                                  <Ionicons name="videocam-outline" size={18} color={isDark ? "#9eb5df" : "#4f6390"} />
                                  <Text style={styles.eventVideoFallbackText}>Video attached</Text>
                                </View>
                              )
                            ) : null}
                            <View style={styles.eventRow}>
                              <View style={styles.eventTextWrap}>
                                <Text style={styles.eventBadge}>{event.mediaType.toUpperCase()}</Text>
                                {Boolean(event.title) ? <Text style={styles.eventTitle}>{event.title}</Text> : null}
                                <Text style={styles.eventText}>{event.caption}</Text>
                                <Text style={styles.eventMeta}>
                                  By {event.uploadedByName || event.uploadedByEmail || event.uploadedBy || "Unknown"} • Uploaded{" "}
                                  {formatUploadedAt(event.createdAt)}
                                </Text>
                              </View>
                              <Pressable
                                style={({ pressed }) => [
                                  styles.likeButton,
                                  isLiked && styles.likeButtonActive,
                                  pressed && styles.likeButtonPressed,
                                ]}
                                onPress={() => toggleLike(event.id)}
                              >
                                <Text style={[styles.likeButtonText, isLiked && styles.likeButtonTextActive]}>
                                  {isLiked ? "Liked" : "Like"}
                                </Text>
                                <Ionicons
                                  name={isLiked ? "heart" : "heart-outline"}
                                  size={14}
                                  color={isLiked ? "#ff4d78" : isDark ? "#98acd2" : "#5d729d"}
                                />
                              </Pressable>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ))}
                </View>
              ))
            )}
          </AppCard>
        ) : (
          <AppCard>
            <View style={styles.profileTop}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{user.name.slice(0, 1).toUpperCase()}</Text>
              </View>
              <View style={styles.profileTextWrap}>
                <Text style={styles.profileName}>{user.name}</Text>
                <Text style={styles.profileEmail}>{user.email}</Text>
              </View>
            </View>

            <View style={styles.profileStatGrid}>
              <View style={styles.profileStatCard}>
                <Text style={styles.profileStatLabel}>Total Events</Text>
                <Text style={styles.profileStatValue}>{eventsCount(groupedEventEntries)}</Text>
              </View>
              <View style={styles.profileStatCard}>
                <Text style={styles.profileStatLabel}>Categories</Text>
                <Text style={styles.profileStatValue}>{eventTypes.length}</Text>
              </View>
            </View>

            <View style={styles.profileMetaCard}>
              <Text style={styles.profileMetaLabel}>Role</Text>
              <Text style={styles.profileMetaValue}>{user.role}</Text>
            </View>

            <AppButton label="Logout" variant="secondary" iconName="log-out-outline" onPress={onLogout} />
          </AppCard>
        )}
      </ScrollView>
      <View style={styles.bottomNavWrap}>
        <View style={styles.bottomNav}>
          <Pressable
            style={({ pressed }) => [styles.navIconButton, pressed && styles.navIconPressed]}
            onPress={() => setActiveTab("view")}
          >
            <Ionicons
              name="list-outline"
              size={24}
              color={activeTab === "view" ? "#ffd42a" : isDark ? "#7f8ba6" : "#7986a7"}
            />
          </Pressable>
          <View style={styles.plusSpace} />
          <Pressable
            style={({ pressed }) => [styles.navIconButton, pressed && styles.navIconPressed]}
            onPress={() => setActiveTab("profile")}
          >
            <Ionicons
              name="person-outline"
              size={24}
              color={activeTab === "profile" ? "#ffd42a" : isDark ? "#7f8ba6" : "#7986a7"}
            />
          </Pressable>
        </View>
        <Pressable
          style={({ pressed }) => [styles.fabButton, pressed && styles.fabPressed]}
          onPress={() => setActiveTab("add")}
        >
          <Ionicons name="add" size={38} color="#0f1117" />
        </Pressable>
      </View>
      <StatusBar style={isDark ? "light" : "dark"} />
    </SafeAreaView>
  );
}

function eventsCount(groupedEventEntries: Array<[string, Record<string, EventItem[]>]>) {
  return groupedEventEntries.reduce((sum, [, byDate]) => {
    const dateTotal = Object.values(byDate).reduce((acc, dateEvents) => acc + dateEvents.length, 0);
    return sum + dateTotal;
  }, 0);
}

function formatUploadedAt(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getStyles(isDark: boolean) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: isDark ? "#0d1322" : "#eef3ff" },
    content: { padding: 18, paddingBottom: 140, gap: 14 },
    modeHint: {
      alignSelf: "flex-start",
      fontSize: 12,
      fontWeight: "700",
      letterSpacing: 0.2,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
      color: isDark ? "#ffd42a" : "#69590d",
      backgroundColor: isDark ? "#1f2330" : "#fff5c8",
      borderWidth: 1,
      borderColor: isDark ? "#353c52" : "#f2e2a1",
    },
    sectionHeading: {
      fontSize: 18,
      fontWeight: "800",
      color: isDark ? "#e4edff" : "#1a2744",
      letterSpacing: 0.2,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    clearButton: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: isDark ? "#1d2433" : "#e5e9f5",
      borderWidth: 1,
      borderColor: isDark ? "#2f3a53" : "#ccd6eb",
    },
    clearButtonText: {
      color: isDark ? "#9da7bf" : "#4d5e86",
      fontWeight: "700",
      fontSize: 12,
    },
    sectionLabel: {
      fontSize: 13,
      fontWeight: "700",
      color: isDark ? "#bfd0f5" : "#3a4968",
      letterSpacing: 0.1,
    },
    helperText: { fontSize: 13, color: isDark ? "#9cb0d8" : "#647595", lineHeight: 20 },
    row: { flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" },
    listRow: { flexDirection: "row", gap: 8, alignItems: "center" },
    mediaHeading: {
      fontSize: 16,
      fontWeight: "700",
      color: isDark ? "#d8dfef" : "#2a3655",
    },
    inputShell: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark ? "#2f3648" : "#ccd7ef",
      backgroundColor: isDark ? "#151a25" : "#f6f8ff",
      paddingHorizontal: 16,
      paddingVertical: 12,
      minHeight: 56,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    eventTitleInput: {
      fontSize: 18,
      fontWeight: "800",
      color: isDark ? "#e9efff" : "#1c2743",
      flex: 1,
    },
    inlineInput: {
      flex: 1,
      fontSize: 16,
      color: isDark ? "#cdd6ea" : "#2d3d5f",
    },
    descriptionCard: {
      borderRadius: 26,
      borderWidth: 1,
      borderColor: isDark ? "#2f3648" : "#ccd7ef",
      backgroundColor: isDark ? "#151a25" : "#f6f8ff",
      paddingHorizontal: 16,
      paddingVertical: 14,
      minHeight: 132,
    },
    descriptionTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    descriptionLabel: {
      fontSize: 15,
      fontWeight: "700",
      color: isDark ? "#c9d4eb" : "#3a4968",
    },
    polishButton: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: "#7a6323",
      backgroundColor: "#3d3220",
      paddingHorizontal: 12,
      paddingVertical: 6,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    polishButtonDisabled: {
      opacity: 0.6,
    },
    polishButtonText: {
      color: "#f0be1b",
      fontWeight: "700",
      fontSize: 12,
    },
    descriptionInput: {
      fontSize: 16,
      color: isDark ? "#cdd6ea" : "#2d3d5f",
      minHeight: 100,
      textAlignVertical: "top",
      lineHeight: 24,
    },
    mediaCard: {
      borderRadius: 26,
      borderWidth: 1,
      borderColor: isDark ? "#2f3648" : "#ccd7ef",
      backgroundColor: isDark ? "#151a25" : "#f6f8ff",
      padding: 14,
      gap: 10,
    },
    mediaTopRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      flexWrap: "wrap",
    },
    captureHint: {
      borderRadius: 16,
      borderWidth: 2,
      borderStyle: "dashed",
      borderColor: isDark ? "#3a4257" : "#c7d2eb",
      minHeight: 68,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 12,
    },
    captureHintText: {
      fontSize: 14,
      color: isDark ? "#6f7d9f" : "#62749c",
      fontWeight: "600",
      textAlign: "center",
    },
    dateTimeRow: {
      flexDirection: "row",
      gap: 10,
    },
    infoPill: {
      flex: 1,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark ? "#2f3648" : "#ccd7ef",
      backgroundColor: isDark ? "#151a25" : "#f6f8ff",
      minHeight: 56,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    pillInput: {
      flex: 1,
      fontSize: 16,
      color: isDark ? "#d7e1f5" : "#2d3d5f",
      fontWeight: "700",
    },
    actionRow: {
      flexDirection: "row",
      gap: 10,
      marginTop: 4,
    },
    saveDraftBtn: {
      flex: 1,
      minHeight: 52,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isDark ? "#38415a" : "#c7d2ec",
      backgroundColor: isDark ? "#111722" : "#f1f5ff",
      justifyContent: "center",
      alignItems: "center",
    },
    saveDraftText: {
      fontSize: 16,
      fontWeight: "700",
      color: isDark ? "#d6e1f8" : "#2d3f63",
    },
    submitBtn: {
      flex: 1.4,
      minHeight: 52,
      borderRadius: 16,
      backgroundColor: "#ffd42a",
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
    },
    submitText: {
      fontSize: 17,
      fontWeight: "800",
      color: "#11141d",
    },
    mediaMeta: { color: isDark ? "#9ab1dd" : "#6e7f9e", fontSize: 12 },
    emptyText: { color: isDark ? "#93a9d5" : "#6e7f9e", fontStyle: "italic", marginTop: 4 },
    group: {
      marginTop: 8,
      gap: 6,
      borderWidth: 1,
      borderColor: isDark ? "#2a3a58" : "#e8eefb",
      borderRadius: 14,
      padding: 10,
      backgroundColor: isDark ? "#1a2640" : "#fcfdff",
    },
    groupTitle: { fontSize: 16, fontWeight: "700", color: isDark ? "#d7e4ff" : "#213153" },
    dateBlock: {
      marginTop: 4,
      marginBottom: 4,
      borderTopWidth: 1,
      borderTopColor: isDark ? "#314669" : "#edf2ff",
      paddingTop: 8,
    },
    dateTitle: { fontSize: 13, fontWeight: "700", color: isDark ? "#9eb6e5" : "#4b5f87" },
    eventRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: 8,
    },
    eventTextWrap: {
      flex: 1,
      gap: 6,
    },
    eventBadge: {
      alignSelf: "flex-start",
      borderRadius: 999,
      borderWidth: 1,
      borderColor: isDark ? "#3d5786" : "#c9d8fb",
      backgroundColor: isDark ? "#253861" : "#edf3ff",
      color: isDark ? "#a8c4ff" : "#2f59d6",
      paddingHorizontal: 8,
      paddingVertical: 2,
      fontSize: 10,
      fontWeight: "700",
      letterSpacing: 0.4,
    },
    eventCard: {
      marginTop: 6,
      gap: 8,
      borderWidth: 1,
      borderColor: isDark ? "#314669" : "#e3ecff",
      borderRadius: 10,
      padding: 8,
      backgroundColor: isDark ? "#16243d" : "#f8fbff",
    },
    eventImage: { width: "100%", height: 180, borderRadius: 8, backgroundColor: isDark ? "#223350" : "#e6eefc" },
    eventVideoWeb: {
      width: "100%",
      height: 220,
      borderRadius: 8,
      backgroundColor: isDark ? "#101826" : "#dde6f7",
    },
    eventVideoFallback: {
      width: "100%",
      height: 80,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: isDark ? "#35507f" : "#bfd0f1",
      backgroundColor: isDark ? "#1b2a46" : "#edf3ff",
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 8,
    },
    eventVideoFallbackText: {
      color: isDark ? "#a7bbe3" : "#4f6390",
      fontWeight: "700",
      fontSize: 13,
    },
    eventTitle: { fontSize: 14, fontWeight: "700", color: isDark ? "#dce8ff" : "#22365f" },
    eventText: { fontSize: 13, color: isDark ? "#bed0f4" : "#506182", lineHeight: 19 },
    eventMeta: { fontSize: 12, color: isDark ? "#90a7d3" : "#5c729b" },
    likeButton: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: isDark ? "#38507a" : "#cfdaef",
      backgroundColor: isDark ? "#1f2d4b" : "#f3f7ff",
      paddingHorizontal: 12,
      paddingVertical: 6,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    },
    likeButtonPressed: { opacity: 0.85 },
    likeButtonActive: {
      borderColor: isDark ? "#7fa2ff" : "#5f81f8",
      backgroundColor: isDark ? "#253962" : "#e4edff",
    },
    likeButtonText: {
      color: isDark ? "#b8c9ef" : "#445a84",
      fontWeight: "700",
      fontSize: 12,
    },
    likeButtonTextActive: {
      color: isDark ? "#9fc0ff" : "#1f4dd1",
    },
    profileTop: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      marginBottom: 4,
    },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#253961" : "#e7efff",
      borderWidth: 1,
      borderColor: isDark ? "#365086" : "#c7d8ff",
    },
    avatarText: {
      fontSize: 24,
      fontWeight: "800",
      color: isDark ? "#c5d9ff" : "#2f57ca",
    },
    profileTextWrap: {
      flex: 1,
      gap: 2,
    },
    profileName: {
      fontSize: 20,
      fontWeight: "800",
      color: isDark ? "#ebf2ff" : "#1a2744",
    },
    profileEmail: {
      fontSize: 13,
      color: isDark ? "#9fb2d8" : "#607297",
    },
    profileStatGrid: {
      flexDirection: "row",
      gap: 10,
    },
    profileStatCard: {
      flex: 1,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isDark ? "#2b3f68" : "#d8e3ff",
      backgroundColor: isDark ? "#162642" : "#f4f8ff",
      padding: 12,
      gap: 4,
    },
    profileStatLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: isDark ? "#9fb7e8" : "#5973a8",
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    profileStatValue: {
      fontSize: 24,
      fontWeight: "800",
      color: isDark ? "#edf3ff" : "#17306b",
    },
    profileMetaCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isDark ? "#2f3d5e" : "#dae3f6",
      backgroundColor: isDark ? "#151f34" : "#f8faff",
      padding: 14,
      gap: 4,
    },
    profileMetaLabel: {
      fontSize: 12,
      fontWeight: "700",
      color: isDark ? "#8ea2ca" : "#5e739d",
      textTransform: "uppercase",
      letterSpacing: 0.6,
    },
    profileMetaValue: {
      fontSize: 16,
      fontWeight: "700",
      color: isDark ? "#d9e5ff" : "#273b66",
    },
    bottomNavWrap: {
      position: "absolute",
      left: 18,
      right: 18,
      bottom: 18,
      alignItems: "center",
    },
    bottomNav: {
      width: "100%",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-around",
      borderRadius: 30,
      paddingVertical: 12,
      paddingHorizontal: 18,
      backgroundColor: isDark ? "rgba(20, 23, 30, 0.96)" : "rgba(26, 30, 39, 0.9)",
      borderWidth: 1,
      borderColor: isDark ? "#2f3648" : "#3a4050",
    },
    plusSpace: {
      width: 66,
    },
    navIconButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: "center",
      justifyContent: "center",
    },
    navIconPressed: {
      opacity: 0.85,
      transform: [{ scale: 0.97 }],
    },
    fabButton: {
      position: "absolute",
      top: -24,
      width: 74,
      height: 74,
      borderRadius: 37,
      backgroundColor: "#ffd42a",
      borderWidth: 6,
      borderColor: isDark ? "#0f1117" : "#12141c",
      alignItems: "center",
      justifyContent: "center",
      ...(Platform.OS === "web"
        ? { boxShadow: "0px 8px 16px rgba(255, 212, 42, 0.25)" }
        : {
            shadowColor: "#ffd42a",
            shadowOpacity: 0.25,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
          }),
      elevation: 8,
    },
    fabPressed: {
      transform: [{ scale: 0.97 }],
    },
  });
}
