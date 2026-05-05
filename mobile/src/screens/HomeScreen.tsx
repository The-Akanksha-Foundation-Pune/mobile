import { useMemo, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppButton, AppCard, FormField, ScreenHeader, SelectChip } from "../components";
import type { EventItem, EventType, MediaMode, SelectedMedia, User } from "../types/app";

type HomeScreenProps = {
  user: User;
  eventTypes: EventType[];
  groupedEvents: Record<string, Record<string, EventItem[]>>;
  selectedTypeId: string;
  caption: string;
  eventDate: string;
  mediaType: MediaMode;
  media: SelectedMedia;
  isLoading: boolean;
  onLogout: () => void;
  onSelectMediaType: (next: MediaMode) => void;
  onSelectType: (typeId: string) => void;
  onChangeEventDate: (next: string) => void;
  onChangeCaption: (next: string) => void;
  onCaptureMedia: () => void;
  onSaveEvent: () => void;
};

type HomeTab = "add" | "view";

export function HomeScreen(props: HomeScreenProps) {
  const {
    user,
    eventTypes,
    groupedEvents,
    selectedTypeId,
    caption,
    eventDate,
    mediaType,
    media,
    isLoading,
    onLogout,
    onSelectMediaType,
    onSelectType,
    onChangeEventDate,
    onChangeCaption,
    onCaptureMedia,
    onSaveEvent,
  } = props;
  const [activeTab, setActiveTab] = useState<HomeTab>("add");
  const [likedEventIds, setLikedEventIds] = useState<Record<string, boolean>>({});
  const groupedEventEntries = useMemo(() => Object.entries(groupedEvents), [groupedEvents]);
  const scheme = useColorScheme();
  const isDark = scheme === "dark";
  const styles = useMemo(() => getStyles(isDark), [isDark]);

  function toggleLike(eventId: string) {
    setLikedEventIds((current) => ({ ...current, [eventId]: !current[eventId] }));
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title={`Welcome, ${user.name}`}
          subtitle="Capture, organize, and browse events"
          onLogout={onLogout}
        />

        <AppCard compact>
          <Text style={styles.sectionLabel}>Choose Tab</Text>
          <View style={styles.row}>
            <SelectChip
              label="Add"
              iconName="add-circle-outline"
              isActive={activeTab === "add"}
              onPress={() => setActiveTab("add")}
            />
            <SelectChip
              label="View"
              iconName="eye-outline"
              isActive={activeTab === "view"}
              onPress={() => setActiveTab("view")}
            />
          </View>
        </AppCard>

        {activeTab === "add" ? (
          <AppCard>
            <Text style={styles.sectionHeading}>Add Event</Text>
            <Text style={styles.helperText}>Fill all details and upload media to create an event.</Text>
            <Text style={styles.sectionLabel}>Select Media Type</Text>
            <View style={styles.row}>
              <SelectChip
                label="Photo"
                iconName="image-outline"
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

            <FormField
              label="Event Date (YYYY-MM-DD)"
              value={eventDate}
              onChangeText={onChangeEventDate}
            />
            <FormField
              label="Caption"
              multiline
              value={caption}
              onChangeText={onChangeCaption}
              placeholder="Write event details..."
            />

            <AppButton
              label={media ? "Retake from Camera" : "Capture from Camera"}
              variant="secondary"
              iconName="camera-outline"
              onPress={onCaptureMedia}
            />
            <Text style={styles.mediaMeta}>
              {media ? `Selected: ${media.fileName || media.uri}` : "No media selected"}
            </Text>
            <AppButton
              label={isLoading ? "Uploading..." : "Save Event"}
              iconName="cloud-upload-outline"
              onPress={onSaveEvent}
              disabled={isLoading}
            />
          </AppCard>
        ) : (
          <AppCard>
            <Text style={styles.sectionHeading}>View Events</Text>
            <Text style={styles.helperText}>Browse events and like the ones you enjoy.</Text>
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
                            <View style={styles.eventRow}>
                              <Text style={styles.eventText}>
                                [{event.mediaType}] {event.caption}
                              </Text>
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
        )}
      </ScrollView>
      <StatusBar style={isDark ? "light" : "dark"} />
    </SafeAreaView>
  );
}

function getStyles(isDark: boolean) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: isDark ? "#0f1627" : "#f2f6ff" },
    content: { padding: 18, paddingBottom: 28, gap: 14 },
    sectionHeading: {
      fontSize: 20,
      fontWeight: "800",
      color: isDark ? "#e4edff" : "#1a2744",
      letterSpacing: 0.2,
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
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
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
    eventText: { flex: 1, fontSize: 13, color: isDark ? "#bed0f4" : "#506182", lineHeight: 19 },
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
  });
}
