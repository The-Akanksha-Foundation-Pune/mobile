import { ReactNode } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AvatarInitials } from "./AvatarInitials";
import { statusToneColor, type StatusTone } from "../../theme/capture";
import { useCaptureTheme } from "../../theme/useCaptureTheme";

export type PostMedia = {
  kind: "photo" | "video";
  uri?: string;
  /** Shown bottom-right on video. */
  durationLabel?: string;
  /** Dark strip over a photo announcing an attached audio clip. */
  audio?: { title: string; durationLabel?: string };
};

export type PostStatus = { label: string; tone: StatusTone };

type Props = {
  authorName: string;
  authorMeta?: string;
  /** Small label on the right of the header, e.g. "Post". */
  typeLabel?: string;
  caption?: string;
  media?: PostMedia;
  /** Footer link text, e.g. the event the post belongs to. */
  linkedLabel?: string;
  status?: PostStatus;
  footerLeft?: ReactNode;
  footerRight?: ReactNode;
  onPress?: () => void;
  onPlay?: () => void;
};

const DARK = "#0B0F19";

/** Directory card for a single post: author, caption, photo or video, link and status. */
export function PostCard({
  authorName,
  authorMeta,
  typeLabel,
  caption,
  media,
  linkedLabel,
  status,
  footerLeft,
  footerRight,
  onPress,
  onPlay,
}: Props) {
  const { c, type, layout, shadow } = useCaptureTheme();
  const hasFooter = Boolean(linkedLabel || status || footerLeft || footerRight);

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={[styles.card, shadow.level1, { backgroundColor: c.surfaceCard, borderRadius: layout.radius.md }]}
    >
      <View style={styles.header}>
        <View style={styles.author}>
          <AvatarInitials name={authorName} size={32} tone="primary" />
          <View style={styles.authorText}>
            <Text style={[type.labelMd, { color: c.onSurface }]} numberOfLines={1}>
              {authorName}
            </Text>
            {authorMeta ? (
              <Text style={[type.bodySm, { color: c.onSurfaceVariant }]} numberOfLines={1}>
                {authorMeta}
              </Text>
            ) : null}
          </View>
        </View>
        {typeLabel ? <Text style={[type.labelSm, { color: c.onSurfaceVariant }]}>{typeLabel}</Text> : null}
      </View>

      {caption ? <Text style={[type.bodySm, styles.caption, { color: c.onSurface }]}>{caption}</Text> : null}

      {media?.kind === "video" ? (
        <View style={[styles.media, { backgroundColor: DARK, borderRadius: layout.radius.md }]}>
          {media.uri ? <Image source={{ uri: media.uri }} style={[StyleSheet.absoluteFill, styles.videoImage]} resizeMode="cover" /> : null}
          <Pressable
            onPress={onPlay}
            disabled={!onPlay}
            style={[styles.play, shadow.level2]}
            accessibilityRole="button"
            accessibilityLabel="Play video"
          >
            <MaterialCommunityIcons name="play" size={28} color={c.primary} style={styles.playIcon} />
          </Pressable>
          {media.durationLabel ? <Text style={[type.labelSm, styles.duration]}>{media.durationLabel}</Text> : null}
        </View>
      ) : media ? (
        <View style={[styles.media, { backgroundColor: c.surfaceContainer, borderRadius: layout.radius.default }]}>
          {media.uri ? (
            <Image source={{ uri: media.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
          ) : (
            <MaterialCommunityIcons name="image-outline" size={28} color={c.onSurfaceVariant} />
          )}
          {media.audio ? (
            <View style={styles.audioBar}>
              <MaterialCommunityIcons name="microphone" size={16} color={c.brandSun} />
              <Text style={[type.labelSm, styles.audioTitle]} numberOfLines={1}>
                {media.audio.title}
              </Text>
              {media.audio.durationLabel ? <Text style={[type.labelSm, styles.audioDuration]}>{media.audio.durationLabel}</Text> : null}
            </View>
          ) : null}
        </View>
      ) : null}

      {hasFooter ? (
        <View style={styles.footer}>
          <View style={styles.footerLeft}>
            {footerLeft ??
              (linkedLabel ? (
                <>
                  <MaterialCommunityIcons name="link-variant" size={14} color={c.tertiary} />
                  <Text style={[type.labelSm, styles.linked, { color: c.onSurfaceVariant }]} numberOfLines={1}>
                    {linkedLabel}
                  </Text>
                </>
              ) : null)}
          </View>
          {footerRight ??
            (status ? (
              <Text style={[type.labelSm, { color: statusToneColor(c, status.tone), fontFamily: "Inter_700Bold" }]}>{status.label}</Text>
            ) : null)}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { overflow: "hidden" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  author: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  authorText: { flex: 1 },
  caption: { paddingHorizontal: 16, paddingBottom: 8, lineHeight: 17 },
  media: { marginHorizontal: 16, height: 176, overflow: "hidden", alignItems: "center", justifyContent: "center" },
  videoImage: { opacity: 0.9 },
  play: { width: 48, height: 48, borderRadius: 24, backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center" },
  playIcon: { marginLeft: 2 },
  duration: { position: "absolute", bottom: 10, right: 10, color: "#ffffff", backgroundColor: "rgba(11,15,25,0.85)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  audioBar: { position: "absolute", left: 10, right: 10, bottom: 10, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, backgroundColor: "rgba(11,15,25,0.85)" },
  audioTitle: { color: "#ffffff", flex: 1 },
  audioDuration: { color: "#dbe2f9" },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16 },
  footerLeft: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1 },
  linked: { flexShrink: 1 },
});
