import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { HeroMedia } from "./HeroMedia";
import { TextButton } from "./TextButton";
import { statusToneColor, type StatusTone } from "../../theme/capture";
import { useCaptureTheme } from "../../theme/useCaptureTheme";

type Props = {
  title: string;
  description?: string;
  dateLabel: string;
  locationLabel?: string;
  /** With an image the card renders the banner variant; without it, the compact variant. */
  imageUri?: string;
  postCount?: number;
  storyCount?: number;
  /** Small lead-in on the compact variant, e.g. "Upcoming Event". */
  kicker?: string;
  statusLabel?: string;
  statusTone?: StatusTone;
  actionLabel?: string;
  onPress?: () => void;
};

function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

/** Directory card for an event: banner with date/location, or a compact text card. */
export function EventCard({
  title,
  description,
  dateLabel,
  locationLabel,
  imageUri,
  postCount = 0,
  storyCount = 0,
  kicker = "Upcoming Event",
  statusLabel,
  statusTone = "warning",
  actionLabel = "View Hub",
  onPress,
}: Props) {
  const { c, type, layout, shadow } = useCaptureTheme();
  const when = locationLabel ? `${dateLabel} • ${locationLabel}` : dateLabel;

  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[styles.card, shadow.level1, { backgroundColor: c.surfaceCard, borderRadius: layout.radius.md }]}>
      {imageUri ? (
        <HeroMedia uri={imageUri} badge={{ icon: "calendar-month", label: "Event" }}>
          <View style={styles.whenRow}>
            <MaterialCommunityIcons name="clock-outline" size={13} color="#dbe2f9" />
            <Text style={[type.labelSm, styles.whenText]} numberOfLines={1}>
              {when}
            </Text>
          </View>
        </HeroMedia>
      ) : null}
      <View style={styles.body}>
        {!imageUri ? (
          <View style={styles.rowBetween}>
            <View style={styles.kickerRow}>
              <MaterialCommunityIcons name="calendar-blank" size={14} color={c.tertiary} />
              <Text style={[type.labelSm, { color: c.tertiary }]}>{kicker}</Text>
            </View>
            {statusLabel ? <Text style={[type.labelSm, { color: statusToneColor(c, statusTone) }]}>{statusLabel}</Text> : null}
          </View>
        ) : null}
        <Text style={[type.headlineSm, { color: c.onSurface }]} numberOfLines={2}>
          {title}
        </Text>
        {description ? (
          <Text style={[type.bodySm, { color: c.onSurfaceVariant }]} numberOfLines={2}>
            {description}
          </Text>
        ) : null}
        {!imageUri ? (
          <View style={styles.whenRow}>
            <MaterialCommunityIcons name="calendar-today" size={13} color={c.onSurfaceVariant} />
            <Text style={[type.labelSm, { color: c.onSurfaceVariant }]} numberOfLines={1}>
              {when}
            </Text>
          </View>
        ) : null}
        <View style={[styles.footer, { borderTopColor: c.cardBorder }]}>
          <View style={styles.counts}>
            {imageUri ? (
              <>
                <Text style={[type.labelSm, { color: c.tertiary }]}>{plural(postCount, "post")}</Text>
                <Text style={[type.labelSm, { color: c.onSurfaceVariant }]}>•</Text>
                <Text style={[type.labelSm, { color: c.onSurfaceVariant }]}>{plural(storyCount, "story").replace("storys", "stories")}</Text>
              </>
            ) : (
              <Text style={[type.labelSm, { color: c.onSurfaceVariant }]}>{plural(postCount, "post")} attached</Text>
            )}
          </View>
          {onPress ? <TextButton label={actionLabel} onPress={onPress} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { overflow: "hidden" },
  body: { padding: 16, gap: 8 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  kickerRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  whenRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  whenText: { color: "#dbe2f9", flexShrink: 1 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, paddingTop: 8, borderTopWidth: 1 },
  counts: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 },
});
