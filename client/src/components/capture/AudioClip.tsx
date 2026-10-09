import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCaptureTheme } from "../../theme/useCaptureTheme";

type Props = {
  title: string;
  durationLabel?: string;
  thumbnailUri?: string;
  playing?: boolean;
  onToggle?: () => void;
};

const BARS = [8, 14, 8, 16, 10, 6, 12, 8, 14, 8, 6];

/** Audio testimonial row: thumbnail, title, play button and a static waveform. */
export function AudioClip({ title, durationLabel, thumbnailUri, playing = false, onToggle }: Props) {
  const { c, type, layout } = useCaptureTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: c.surfaceContainerLow, borderRadius: layout.radius.md }]}>
      {thumbnailUri ? (
        <Image source={{ uri: thumbnailUri }} style={[styles.thumb, { borderRadius: layout.radius.default }]} />
      ) : (
        <View style={[styles.thumb, styles.thumbFallback, { backgroundColor: c.surfaceContainer, borderRadius: layout.radius.default }]}>
          <MaterialCommunityIcons name="microphone" size={22} color={c.onSurfaceVariant} />
        </View>
      )}
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[type.labelMd, { color: c.onSurface, flex: 1 }]} numberOfLines={1}>
            {title}
          </Text>
          {durationLabel ? <Text style={[styles.duration, { color: c.onSurfaceVariant }]}>{durationLabel}</Text> : null}
        </View>
        <View style={styles.controls}>
          <Pressable
            onPress={onToggle}
            disabled={!onToggle}
            accessibilityRole="button"
            accessibilityLabel={playing ? "Pause audio" : "Play audio"}
            style={[styles.play, { backgroundColor: playing ? c.statusSuccess : c.primary }]}
          >
            <MaterialCommunityIcons name={playing ? "pause" : "play"} size={16} color={c.onPrimary} />
          </Pressable>
          <View style={styles.wave}>
            {BARS.map((height, index) => (
              <View
                key={index}
                style={[styles.bar, { height, backgroundColor: c.primary, opacity: playing || index < 4 ? 1 : 0.4 }]}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12 },
  thumb: { width: 56, height: 56 },
  thumbFallback: { alignItems: "center", justifyContent: "center" },
  body: { flex: 1, minWidth: 0, gap: 4 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  duration: { fontFamily: "Inter_600SemiBold", fontSize: 11, lineHeight: 14, fontVariant: ["tabular-nums"] },
  controls: { flexDirection: "row", alignItems: "center", gap: 8 },
  play: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  wave: { flex: 1, flexDirection: "row", alignItems: "center", gap: 2, height: 20 },
  bar: { width: 4, borderRadius: 2 },
});
