import { useEffect, useMemo, useState } from "react";
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppButton, SelectChip } from "../components";
import { polishEventDescription } from "../services/api";
import type { City, CostCenter, EventType, MediaMode, SelectedMedia } from "../types/app";
import { darkPalette, palette } from "../theme/theme";

type AddEventScreenProps = {
  token: string;
  city: City;
  costCenter: CostCenter;
  eventTypes: EventType[];
  selectedTypeId: string;
  eventTitle: string;
  caption: string;
  eventDate: string;
  mediaType: MediaMode;
  media: SelectedMedia;
  isLoading: boolean;
  onClose: () => void;
  onSelectMediaType: (next: MediaMode) => void;
  onSelectType: (typeId: string) => void;
  onChangeEventDate: (next: string) => void;
  onChangeEventTitle: (next: string) => void;
  onChangeCaption: (next: string) => void;
  onChangeLocation: (next: string) => void;
  onCaptureMedia: () => void;
  onSaveEvent: () => void | Promise<void>;
};

export function AddEventScreen(props: AddEventScreenProps) {
  const {
    token,
    city,
    costCenter,
    eventTypes,
    selectedTypeId,
    eventTitle,
    caption,
    eventDate,
    mediaType,
    media,
    isLoading,
    onClose,
    onSelectMediaType,
    onSelectType,
    onChangeEventDate,
    onChangeEventTitle,
    onChangeCaption,
    onChangeLocation,
    onCaptureMedia,
    onSaveEvent,
  } = props;

  const [location, setLocation] = useState("");
  const [isPolishing, setIsPolishing] = useState(false);
  const [polishCooldownUntil, setPolishCooldownUntil] = useState(0);
  const isDark = useColorScheme() === "dark";
  const styles = useMemo(() => getStyles(isDark), [isDark]);
  const colors = isDark ? darkPalette : palette;
  const isPolishCooldownActive = Date.now() < polishCooldownUntil;

  useEffect(() => {
    onChangeLocation(location);
  }, [location, onChangeLocation]);

  useEffect(() => {
    if (!polishCooldownUntil) return;
    const remainingMs = polishCooldownUntil - Date.now();
    if (remainingMs <= 0) {
      setPolishCooldownUntil(0);
      return;
    }
    const timeout = setTimeout(() => setPolishCooldownUntil(0), remainingMs);
    return () => clearTimeout(timeout);
  }, [polishCooldownUntil]);

  const selectedEventTypeName = eventTypes.find((type) => type.id === selectedTypeId)?.name;

  async function handlePolishDescription() {
    if (isPolishCooldownActive) {
      const waitSeconds = Math.max(1, Math.ceil((polishCooldownUntil - Date.now()) / 1000));
      Alert.alert("Please wait", `Try polishing again in ${waitSeconds}s.`);
      return;
    }
    try {
      setIsPolishing(true);
      const polished = await polishEventDescription({
        token,
        description: caption,
        context: {
          title: eventTitle.trim() || undefined,
          cityName: city.name,
          costCenterName: costCenter.name,
          costCenterCode: costCenter.code,
          eventTypeName: selectedEventTypeName,
          location: location.trim() || undefined,
          eventDate: eventDate || undefined,
        },
      });
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
      <View style={styles.header}>
        <Pressable onPress={onClose}>
          <Ionicons name="arrow-back" size={22} color={colors.ink} />
        </Pressable>
        <Text style={styles.headerTitle}>Add event • {costCenter.code}</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.ccHint}>
          {city.name} • {costCenter.name} ({costCenter.code}) — event type required below
        </Text>
        <TextInput
          style={styles.titleInput}
          placeholder="Event title"
          placeholderTextColor={colors.inkSoft}
          value={eventTitle}
          onChangeText={onChangeEventTitle}
        />

        <View style={styles.descriptionCard}>
          <View style={styles.rowBetween}>
            <Text style={styles.label}>Description</Text>
            <Pressable
              style={[styles.polishBtn, (isPolishing || !caption.trim() || isPolishCooldownActive) && styles.disabled]}
              onPress={() => void handlePolishDescription()}
              disabled={isPolishing || !caption.trim() || isPolishCooldownActive}
            >
              <Ionicons name="sparkles-outline" size={14} color={palette.accent} />
              <Text style={styles.polishText}>{isPolishing ? "Polishing..." : "Polish"}</Text>
            </Pressable>
          </View>
          <TextInput
            style={styles.descriptionInput}
            placeholder="Describe the event"
            placeholderTextColor={colors.inkSoft}
            value={caption}
            onChangeText={onChangeCaption}
            multiline
          />
        </View>

        <View style={styles.row}>
          <SelectChip label="Photo" iconName="camera-outline" isActive={mediaType === "photo"} onPress={() => onSelectMediaType("photo")} />
          <SelectChip label="Video" iconName="videocam-outline" isActive={mediaType === "video"} onPress={() => onSelectMediaType("video")} />
        </View>

        <Pressable style={styles.captureBox} onPress={onCaptureMedia}>
          <Text style={styles.captureText}>
            {media ? `Selected: ${media.fileName || "Captured media"}` : "Tap to capture photo or video"}
          </Text>
        </Pressable>

        <TextInput
          style={styles.field}
          value={eventDate}
          onChangeText={onChangeEventDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.inkSoft}
        />
        <TextInput
          style={styles.field}
          value={location}
          onChangeText={setLocation}
          placeholder="Venue / location"
          placeholderTextColor={colors.inkSoft}
        />

        <Text style={styles.label}>Event type</Text>
        <FlatList
          horizontal
          data={eventTypes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SelectChip label={item.name} isActive={selectedTypeId === item.id} onPress={() => onSelectType(item.id)} />
          )}
          contentContainerStyle={styles.typeList}
        />

        <AppButton label={isLoading ? "Uploading..." : "Submit event"} onPress={onSaveEvent} />
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
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.surface,
    },
    headerTitle: { fontSize: 15, fontWeight: "800", color: colors.ink },
    content: { padding: 16, gap: 12, paddingBottom: 30 },
    ccHint: { fontSize: 12, color: colors.inkSoft, fontWeight: "600" },
    titleInput: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14,
      fontSize: 18,
      fontWeight: "800",
      color: colors.ink,
    },
    descriptionCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 12,
      gap: 8,
    },
    rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    label: { fontSize: 13, fontWeight: "700", color: colors.inkSoft },
    polishBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: "#7a6323",
      backgroundColor: "#3d3220",
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    polishText: { color: palette.accent, fontWeight: "700", fontSize: 12 },
    disabled: { opacity: 0.6 },
    descriptionInput: { minHeight: 100, fontSize: 15, color: colors.ink, textAlignVertical: "top" },
    row: { flexDirection: "row", gap: 8 },
    captureBox: {
      borderRadius: 14,
      borderWidth: 2,
      borderStyle: "dashed",
      borderColor: colors.border,
      minHeight: 72,
      alignItems: "center",
      justifyContent: "center",
      padding: 12,
      backgroundColor: colors.surface,
    },
    captureText: { color: colors.inkSoft, fontWeight: "600" },
    field: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 12,
      fontSize: 15,
      color: colors.ink,
    },
    typeList: { gap: 8, paddingVertical: 4 },
  });
}
