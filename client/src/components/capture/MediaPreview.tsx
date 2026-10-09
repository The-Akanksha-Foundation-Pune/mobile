import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useCaptureTheme } from "../../theme/useCaptureTheme";

export type MediaBadge = { label: string; icon?: keyof typeof MaterialCommunityIcons.glyphMap; iconColor?: string };

type Props = {
  uri?: string;
  kind: "photo" | "video";
  badge?: MediaBadge;
  aspectRatio?: number;
  onPress?: () => void;
};

/** Photo or video preview with an optional top-left badge and a play button for video. */
export function MediaPreview({ uri, kind, badge, aspectRatio = 16 / 10, onPress }: Props) {
  const { c, layout } = useCaptureTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[styles.frame, { aspectRatio, borderRadius: layout.radius.md, backgroundColor: c.surfaceContainer }]}
    >
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <View style={styles.center}>
          <MaterialCommunityIcons name={kind === "video" ? "video-outline" : "image-outline"} size={28} color={c.onSurfaceVariant} />
        </View>
      )}
      {badge ? (
        <View style={styles.badge}>
          {badge.icon ? <MaterialCommunityIcons name={badge.icon} size={13} color={badge.iconColor ?? "#fff"} /> : null}
          <Text style={styles.badgeText}>{badge.label}</Text>
        </View>
      ) : null}
      {kind === "video" && uri ? (
        <View style={styles.center} pointerEvents="none">
          <View style={styles.playCircle}>
            <MaterialCommunityIcons name="play" size={24} color="#fff" />
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: { width: "100%", overflow: "hidden" },
  center: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  badgeText: { color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: 11, lineHeight: 14 },
  playCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
});
