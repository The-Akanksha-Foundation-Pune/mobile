import { ReactNode } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { MediaBadge } from "./MediaPreview";
import { useCaptureTheme } from "../../theme/useCaptureTheme";

type Props = {
  uri?: string;
  height?: number;
  badge?: MediaBadge;
  /** Rendered over the lower part of the image, e.g. a title or date line. */
  children?: ReactNode;
  radius?: number;
  onPress?: () => void;
};

const SCRIM = "11,15,25";

/** Image banner with a dark bottom scrim, a top-left badge and an overlay slot. */
export function HeroMedia({ uri, height = 176, badge, children, radius = 0, onPress }: Props) {
  const { c } = useCaptureTheme();
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[styles.frame, { height, borderRadius: radius, backgroundColor: c.surfaceContainer }]}>
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
      ) : (
        <View style={styles.center}>
          <MaterialCommunityIcons name="image-outline" size={32} color={c.onSurfaceVariant} />
        </View>
      )}
      <View style={styles.scrim} pointerEvents="none">
        <View style={{ flex: 1, backgroundColor: `rgba(${SCRIM},0.12)` }} />
        <View style={{ flex: 1, backgroundColor: `rgba(${SCRIM},0.38)` }} />
        <View style={{ flex: 1, backgroundColor: `rgba(${SCRIM},0.7)` }} />
      </View>
      {badge ? (
        <View style={styles.badge}>
          {badge.icon ? <MaterialCommunityIcons name={badge.icon} size={13} color={badge.iconColor ?? "#fff"} /> : null}
          <Text style={styles.badgeText}>{badge.label}</Text>
        </View>
      ) : null}
      {children ? <View style={styles.overlay}>{children}</View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: { width: "100%", overflow: "hidden" },
  center: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  scrim: { position: "absolute", left: 0, right: 0, bottom: 0, height: "65%" },
  badge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(11,15,25,0.8)",
  },
  badgeText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 10, lineHeight: 14, letterSpacing: 0.4 },
  overlay: { position: "absolute", left: 12, right: 12, bottom: 12 },
});
