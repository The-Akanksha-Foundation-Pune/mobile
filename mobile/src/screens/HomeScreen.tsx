import { StatusBar } from "expo-status-bar";
import { FlatList, ScrollView, StyleSheet, Text, View } from "react-native";
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

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          title={`Welcome, ${user.name}`}
          subtitle="Capture events by type and date"
          onLogout={onLogout}
        />

        <AppCard>
          <Text style={styles.sectionLabel}>Select Media Type</Text>
          <View style={styles.row}>
            <SelectChip
              label="Photo"
              isActive={mediaType === "photo"}
              onPress={() => onSelectMediaType("photo")}
            />
            <SelectChip
              label="Video"
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
            contentContainerStyle={styles.row}
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
            onPress={onCaptureMedia}
          />
          <Text style={styles.mediaMeta}>
            {media ? `Selected: ${media.fileName || media.uri}` : "No media selected"}
          </Text>
          <AppButton
            label={isLoading ? "Uploading..." : "Save Event"}
            onPress={onSaveEvent}
            disabled={isLoading}
          />
        </AppCard>

        <AppCard>
          <Text style={styles.sectionHeading}>Events Grouped by Type and Date</Text>
          {Object.keys(groupedEvents).length === 0 ? (
            <Text style={styles.emptyText}>No events uploaded yet.</Text>
          ) : (
            Object.entries(groupedEvents).map(([typeName, byDate]) => (
              <View key={typeName} style={styles.group}>
                <Text style={styles.groupTitle}>{typeName}</Text>
                {Object.entries(byDate).map(([date, dateEvents]) => (
                  <View key={`${typeName}-${date}`} style={styles.dateBlock}>
                    <Text style={styles.dateTitle}>{date}</Text>
                    {dateEvents.map((event) => (
                      <Text key={event.id} style={styles.eventText}>
                        - [{event.mediaType}] {event.caption}
                      </Text>
                    ))}
                  </View>
                ))}
              </View>
            ))
          )}
        </AppCard>
      </ScrollView>
      <StatusBar style="dark" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f5f7fb" },
  content: { padding: 16, gap: 12 },
  sectionHeading: { fontSize: 18, fontWeight: "700", color: "#1b2233" },
  sectionLabel: { fontSize: 13, fontWeight: "600", color: "#293044" },
  row: { flexDirection: "row", gap: 8, alignItems: "center" },
  mediaMeta: { color: "#4f5c78", fontSize: 12 },
  emptyText: { color: "#4f5c78", fontStyle: "italic" },
  group: { marginTop: 6, gap: 4 },
  groupTitle: { fontSize: 16, fontWeight: "700", color: "#1d2a48" },
  dateBlock: { marginLeft: 8, marginBottom: 6 },
  dateTitle: { fontSize: 14, fontWeight: "600", color: "#32435f" },
  eventText: { fontSize: 13, color: "#4f5c78", marginLeft: 8 },
});
