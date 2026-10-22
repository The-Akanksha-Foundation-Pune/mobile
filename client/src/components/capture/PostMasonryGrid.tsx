import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AvatarInitials } from "./AvatarInitials";
import { statusToneColor, type StatusTone } from "../../theme/capture";
import { useCaptureTheme } from "../../theme/useCaptureTheme";
import { RemoteImage } from "./RemoteImage";

export type MasonryPost = {
  id: string;
  uri?: string;
  kind: "photo" | "video";
  caption?: string;
  authorName: string;
  /** Optional small tag at the top-left, e.g. "Pending review" for reviewers. */
  statusLabel?: string;
  statusTone?: StatusTone;
};

type TileProps = { post: MasonryPost; aspectRatio: number; onPress?: () => void };

/** Rounded image tile with a soft scrim, author and caption at the bottom. */
export function PostTile({ post, aspectRatio, onPress }: TileProps) {
  const { c, type, layout, shadow } = useCaptureTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={post.caption || `Post by ${post.authorName}`}
      style={({ pressed }) => [styles.tile, shadow.level1, { aspectRatio, borderRadius: layout.radius.md, backgroundColor: c.surfaceContainer, opacity: pressed ? 0.92 : 1 }]}
    >
      <RemoteImage uri={post.uri} />
      {post.statusLabel ? (
        <View style={styles.statusPill}>
          <Text style={[styles.statusText, { color: statusToneColor(c, post.statusTone ?? "warning") }]}>{post.statusLabel}</Text>
        </View>
      ) : null}
      {post.kind === "video" ? (
        <View style={styles.playBadge}>
          <MaterialCommunityIcons name="play" size={16} color="#fff" />
        </View>
      ) : null}
      <View style={styles.scrim} pointerEvents="none">
        <View style={styles.scrimBand1} />
        <View style={styles.scrimBand2} />
      </View>
      <View style={styles.footer}>
        <AvatarInitials name={post.authorName} size={22} />
        <Text style={[type.labelSm, styles.caption]} numberOfLines={2}>
          {post.caption || post.authorName}
        </Text>
      </View>
    </Pressable>
  );
}

type GridProps = {
  posts: MasonryPost[];
  onOpen?: (post: MasonryPost) => void;
  columns?: number;
  gap?: number;
};

/** Varied-height tiles, cycling through a few ratios for a gallery feel. */
const RATIOS = [1, 0.8, 1.25, 0.95, 0.72, 1.1];

/** Pinterest-style grid: tiles are placed into whichever column is currently shortest. */
export function PostMasonryGrid({ posts, onOpen, columns = 2, gap = 10 }: GridProps) {
  const laidOut = useMemo(() => {
    const cols: { items: { post: MasonryPost; ratio: number }[]; height: number }[] = Array.from({ length: columns }, () => ({ items: [], height: 0 }));
    posts.forEach((post, index) => {
      const ratio = RATIOS[index % RATIOS.length];
      const target = cols.reduce((best, col) => (col.height < best.height ? col : best), cols[0]);
      target.items.push({ post, ratio });
      target.height += 1 / ratio;
    });
    return cols;
  }, [posts, columns]);

  return (
    <View style={[styles.grid, { gap }]}>
      {laidOut.map((col, index) => (
        <View key={index} style={[styles.column, { gap }]}>
          {col.items.map(({ post, ratio }) => (
            <PostTile key={post.id} post={post} aspectRatio={ratio} onPress={onOpen ? () => onOpen(post) : undefined} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", alignItems: "flex-start" },
  column: { flex: 1 },
  tile: { width: "100%", overflow: "hidden" },
  statusPill: { position: "absolute", top: 8, left: 8, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.94)" },
  statusText: { fontFamily: "Inter_700Bold", fontSize: 9, letterSpacing: 0.3 },
  playBadge: { position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(11,15,25,0.65)", alignItems: "center", justifyContent: "center" },
  scrim: { position: "absolute", left: 0, right: 0, bottom: 0, height: "55%" },
  scrimBand1: { flex: 1, backgroundColor: "rgba(11,15,25,0.18)" },
  scrimBand2: { flex: 1, backgroundColor: "rgba(11,15,25,0.62)" },
  footer: { position: "absolute", left: 8, right: 8, bottom: 8, flexDirection: "row", alignItems: "center", gap: 6 },
  caption: { color: "#fff", flex: 1, lineHeight: 13 },
});
