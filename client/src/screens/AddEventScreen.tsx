import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { CaptureHeader } from "../components";
import { BottomSheet, CaptureButton, CaptureInput, OptionRow, popupAlert } from "../components/capture";
import { fetchSettings, polishEventDescription, PolishLimitError } from "../services/api";
import { AI_POLISH_ENABLED } from "../config/constants";
import type { City, ContentKind, CostCenter, EventItem, MediaMode, SelectedMedia } from "../types/app";
import { useCaptureTheme, type CaptureColors } from "../theme/useCaptureTheme";
import { formatEventDate } from "../utils/eventPresenters";

type AddEventScreenProps = {
  token: string;
  city: City;
  costCenter: CostCenter | null;
  eventTitle: string;
  caption: string;
  eventDate: string;
  mediaType: MediaMode;
  media: SelectedMedia;
  isLoading: boolean;
  onClose: () => void;
  onSelectMediaType: (next: MediaMode) => void;
  onChangeEventDate: (next: string) => void;
  onChangeEventTitle: (next: string) => void;
  onChangeCaption: (next: string) => void;
  onChangeLocation: (next: string) => void;
  onCaptureMedia: () => Promise<boolean>;
  onPickMedia?: () => Promise<boolean>;
  /** Receives the event the post or story belongs to (null when creating an event). */
  onSaveEvent: (parentEvent: EventItem | null) => void | Promise<void>;
  mode?: ContentKind;
  parentEvent?: EventItem | null;
  /** Events that currently accept posts and stories. */
  events?: EventItem[];
  body?: string;
  onChangeBody?: (next: string) => void;
  endDate?: string;
  onChangeEndDate?: (next: string) => void;
};

/** Mints an id for one open form so the server can count AI polishes against this draft only. */
function newDraftId() {
  return `draft-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Capture details screen: media on top, then the few fields each kind needs. */
export function AddEventScreen(props: AddEventScreenProps) {
  const {
    token,
    city,
    costCenter,
    eventTitle,
    caption,
    eventDate,
    mediaType,
    media,
    isLoading,
    onClose,
    onSelectMediaType,
    onChangeEventDate,
    onChangeEventTitle,
    onChangeCaption,
    onChangeLocation,
    onCaptureMedia,
    onPickMedia,
    onSaveEvent,
    mode = "event",
    parentEvent = null,
    events = [],
    body = "",
    onChangeBody,
    endDate = "",
    onChangeEndDate,
  } = props;
  const { c, type } = useCaptureTheme();
  const styles = useMemo(() => getStyles(c), [c]);
  const [location, setLocation] = useState("");
  const [parent, setParent] = useState<EventItem | null>(parentEvent);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [polishCooldownUntil, setPolishCooldownUntil] = useState(0);
  // The screen unmounts when closed, so a fresh draft id (and allowance) comes with each new form.
  const [draftId] = useState(newDraftId);
  /** Polishes left for this draft; null until the limit has loaded. */
  const [polishRemaining, setPolishRemaining] = useState<number | null>(null);
  const [polishLimit, setPolishLimit] = useState<number | null>(null);
  const isPolishCooldownActive = Date.now() < polishCooldownUntil;
  const isPolishExhausted = polishRemaining !== null && polishRemaining <= 0;
  const isEvent = mode === "event";

  useEffect(() => {
    let cancelled = false;
    fetchSettings(token)
      .then(({ limits }) => {
        if (cancelled) return;
        setPolishLimit(limits.polish);
        setPolishRemaining(limits.polish);
      })
      .catch(() => undefined); // The server still enforces the limit; the button just shows no count.
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    onChangeLocation(location);
  }, [location, onChangeLocation]);

  useEffect(() => {
    setParent(parentEvent);
  }, [parentEvent]);

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

  const headerTitle = mode === "post" ? "New post" : mode === "story" ? "New story" : "New event";
  const submitLabel = isLoading ? "Uploading..." : mode === "post" ? "Share post" : mode === "story" ? "Publish story" : "Create event";
  const captionLabel = isEvent ? "Description" : mode === "story" ? "Short excerpt" : "Caption";
  const polishLabel = isPolishing
    ? "Polishing..."
    : isPolishExhausted
      ? "No polishes left"
      : polishRemaining !== null
        ? `Polish with AI · ${polishRemaining} left`
        : "Polish with AI";
  const polishDisabled = isPolishing || !caption.trim() || isPolishCooldownActive || isPolishExhausted;

  async function handlePolishDescription() {
    if (isPolishCooldownActive) {
      const waitSeconds = Math.max(1, Math.ceil((polishCooldownUntil - Date.now()) / 1000));
      popupAlert("Please wait", `Try polishing again in ${waitSeconds}s.`);
      return;
    }
    if (isPolishExhausted) {
      popupAlert("No polishes left", `You can polish each ${mode} ${polishLimit ?? 0} ${polishLimit === 1 ? "time" : "times"}. Edit the text yourself to finish it.`);
      return;
    }
    try {
      setIsPolishing(true);
      const result = await polishEventDescription({
        token,
        description: caption,
        draftId,
        kind: mode,
        context: {
          title: (eventTitle || parent?.title || "").trim() || undefined,
          cityName: city.name,
          costCenterName: costCenter?.name,
          costCenterCode: costCenter?.code,
          location: location.trim() || parent?.location || undefined,
          eventDate: eventDate || parent?.eventDate || undefined,
        },
      });
      onChangeCaption(result.polished);
      if (result.remaining !== null) setPolishRemaining(result.remaining);
      if (result.limit > 0) setPolishLimit(result.limit);
      if (result.fallback) popupAlert("Tidied without AI", result.message || "Google AI is unavailable right now, so the text was only tidied up.");
    } catch (error) {
      if (error instanceof PolishLimitError) {
        setPolishRemaining(0);
        setPolishLimit(error.limit);
        popupAlert("No polishes left", error.message);
        return;
      }
      const message = (error as Error).message;
      if (message.toLowerCase().includes("rate limit")) setPolishCooldownUntil(Date.now() + 20_000);
      popupAlert("Polish failed", message);
    } finally {
      setIsPolishing(false);
    }
  }

  function handleSubmit() {
    if (!isEvent && !parent) {
      popupAlert("Choose an event", `Pick the event this ${mode} belongs to.`);
      setPickerOpen(true);
      return;
    }
    void onSaveEvent(isEvent ? null : parent);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <CaptureHeader title={headerTitle} subtitle={parent ? parent.title || "Untitled event" : city.name} onBack={onClose} right={null} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {media ? (
          <View style={styles.preview}>
            {mediaType === "photo" ? (
              <Image resizeMethod="resize" source={{ uri: media.uri }} style={styles.previewImage} resizeMode="cover" />
            ) : (
              <View style={[styles.previewImage, styles.videoBox]}>
                <MaterialCommunityIcons name="play-circle-outline" size={48} color="#fff" />
                <Text style={[type.labelMd, styles.videoText]} numberOfLines={1}>
                  {media.fileName || "Video selected"}
                </Text>
              </View>
            )}
            <View style={styles.previewActions}>
              <Pressable onPress={() => void onCaptureMedia()} style={styles.previewBtn} accessibilityRole="button" accessibilityLabel="Retake">
                <MaterialCommunityIcons name="camera-retake-outline" size={16} color="#fff" />
                <Text style={[type.labelSm, styles.previewBtnText]}>Retake</Text>
              </Pressable>
              {onPickMedia ? (
                <Pressable onPress={() => void onPickMedia()} style={styles.previewBtn} accessibilityRole="button" accessibilityLabel="Choose from gallery">
                  <MaterialCommunityIcons name="image-multiple-outline" size={16} color="#fff" />
                  <Text style={[type.labelSm, styles.previewBtnText]}>Gallery</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : (
          <View style={[styles.captureBox, { borderColor: c.chipBorder, backgroundColor: c.surfaceCard }]}>
            <View style={styles.modeRow}>
              {(["photo", "video"] as MediaMode[]).map((option) => {
                const active = mediaType === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => onSelectMediaType(option)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    style={[styles.modePill, { backgroundColor: active ? c.neutral : c.surfaceContainerLow }]}
                  >
                    <MaterialCommunityIcons name={option === "photo" ? "camera-outline" : "video-outline"} size={16} color={active ? "#fff" : c.onSurfaceVariant} />
                    <Text style={[type.labelMd, { color: active ? "#fff" : c.onSurface }]}>{option === "photo" ? "Photo" : "Video"}</Text>
                  </Pressable>
                );
              })}
            </View>
            <CaptureButton label={mediaType === "photo" ? "Take a photo" : "Record a video"} icon="camera-outline" onPress={() => void onCaptureMedia()} />
            {onPickMedia ? <CaptureButton label="Choose from gallery" variant="secondary" icon="image-multiple-outline" onPress={() => void onPickMedia()} /> : null}
          </View>
        )}

        {!isEvent ? (
          <Pressable
            onPress={() => setPickerOpen(true)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.eventRow, { backgroundColor: pressed ? c.surfaceContainer : c.surfaceContainerLow }]}
          >
            <View style={[styles.eventIcon, { backgroundColor: c.surfaceContainerHigh }]}>
              <MaterialCommunityIcons name="calendar-month" size={18} color={c.primary} />
            </View>
            <View style={styles.grow}>
              <Text style={[type.labelSm, { color: c.onSurfaceVariant, letterSpacing: 0.5 }]}>EVENT</Text>
              <Text style={[type.labelLg, { color: parent ? c.onSurface : c.onSurfaceVariant }]} numberOfLines={1}>
                {parent ? parent.title || "Untitled event" : "Choose an event"}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={20} color={c.onSurfaceVariant} />
          </Pressable>
        ) : null}

        {mode !== "post" ? (
          <CaptureInput
            label={isEvent ? "Event title" : "Story title"}
            value={eventTitle}
            onChangeText={onChangeEventTitle}
            placeholder={isEvent ? "e.g. Annual Science Fair 2026" : "e.g. Priya's leap to the Math Olympiad"}
          />
        ) : null}

        <View style={styles.field}>
          <View style={styles.labelRow}>
            <Text style={[type.labelMd, { color: c.onSurfaceVariant }]}>{captionLabel}</Text>
            {AI_POLISH_ENABLED ? (
              <Pressable
                onPress={() => void handlePolishDescription()}
                disabled={polishDisabled}
                accessibilityRole="button"
                accessibilityLabel={polishLabel}
                style={[styles.polishBtn, { backgroundColor: c.surfaceContainerLow, opacity: polishDisabled ? 0.5 : 1 }]}
              >
                <MaterialCommunityIcons name="creation" size={14} color={c.secondary} />
                <Text style={[type.labelSm, { color: c.secondary }]}>{polishLabel}</Text>
              </Pressable>
            ) : null}
          </View>
          <CaptureInput
            multiline
            value={caption}
            onChangeText={onChangeCaption}
            placeholder={isEvent ? "What is this event about?" : mode === "story" ? "One or two lines that introduce the story" : "Write a caption..."}
          />
        </View>

        {mode === "story" ? (
          <CaptureInput label="Story" multiline value={body} onChangeText={onChangeBody} placeholder="Tell the full story. Blank lines start new paragraphs." style={styles.storyInput} />
        ) : null}

        {isEvent ? (
          <>
            <View style={styles.dateRow}>
              <View style={styles.grow}>
                <CaptureInput label="Start date" value={eventDate} onChangeText={onChangeEventDate} placeholder="YYYY-MM-DD" autoCapitalize="none" />
              </View>
              <View style={styles.grow}>
                <CaptureInput label="End date (optional)" value={endDate} onChangeText={onChangeEndDate} placeholder="YYYY-MM-DD" autoCapitalize="none" />
              </View>
            </View>
            <Text style={[type.bodySm, { color: c.onSurfaceVariant }]}>Posts and stories can be added only between these dates.</Text>
            <CaptureInput label="Location" value={location} onChangeText={setLocation} placeholder="Venue or centre" />
            <Text style={[type.bodySm, { color: c.onSurfaceVariant }]}>
              {costCenter ? `${city.name} • ${costCenter.name} (${costCenter.code})` : city.name}
            </Text>
          </>
        ) : null}

        <CaptureButton label={submitLabel} icon={isEvent ? "calendar-plus" : "send"} onPress={handleSubmit} loading={isLoading} />
      </ScrollView>

      <BottomSheet visible={pickerOpen} onClose={() => setPickerOpen(false)} title="Choose an event">
        <View style={styles.sheet}>
          {events.length === 0 ? (
            <Text style={[type.bodySm, styles.sheetEmpty, { color: c.onSurfaceVariant }]}>No events are open for posts yet.</Text>
          ) : (
            events.map((event) => (
              <OptionRow
                key={event.id}
                icon={parent?.id === event.id ? "check-circle" : "calendar-month"}
                label={event.title || "Untitled event"}
                description={`${formatEventDate(event.eventDate)}${event.cityName ? ` • ${event.cityName}` : ""}`}
                onPress={() => {
                  setParent(event);
                  setPickerOpen(false);
                }}
              />
            ))
          )}
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

function getStyles(c: CaptureColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.surface },
    content: { padding: 16, gap: 14, paddingBottom: 32 },
    grow: { flex: 1 },
    preview: { borderRadius: 16, overflow: "hidden", backgroundColor: c.surfaceContainer },
    previewImage: { width: "100%", aspectRatio: 4 / 5 },
    videoBox: { backgroundColor: "#0B0F19", alignItems: "center", justifyContent: "center", gap: 8 },
    videoText: { color: "#dbe2f9" },
    previewActions: { position: "absolute", right: 10, bottom: 10, flexDirection: "row", gap: 8 },
    previewBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, minHeight: 34, borderRadius: 999, backgroundColor: "rgba(11,15,25,0.72)" },
    previewBtnText: { color: "#fff" },
    captureBox: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 12 },
    modeRow: { flexDirection: "row", gap: 8 },
    modePill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, minHeight: 36, borderRadius: 999 },
    eventRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderRadius: 12 },
    eventIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    field: { gap: 6 },
    dateRow: { flexDirection: "row", gap: 10 },
    labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    polishBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, minHeight: 28, borderRadius: 999 },
    storyInput: { minHeight: 180 },
    sheet: { gap: 8, paddingBottom: 8 },
    sheetEmpty: { textAlign: "center", paddingVertical: 24 },
  });
}
