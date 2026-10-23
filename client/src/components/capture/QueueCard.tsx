import { ReactNode, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { AvatarInitials } from "./AvatarInitials";
import { Badge, BadgeTone } from "./Badge";
import { CaptureButton } from "./CaptureButton";
import { Checkbox } from "./Checkbox";
import { MediaBadge, MediaPreview } from "./MediaPreview";
import { AudioClip } from "./AudioClip";
import { TagChip, TagChipProps } from "./TagChip";
import { useCaptureTheme } from "../../theme/useCaptureTheme";

export type QueueMedia =
  | { kind: "photo" | "video"; uri: string; badge?: MediaBadge }
  | { kind: "audio"; title: string; durationLabel?: string; thumbnailUri?: string };

/** View model for a card. Screens map their own records into this shape. */
export type QueueItem = {
  id: string;
  authorName: string;
  authorRole?: string;
  roleTone?: BadgeTone;
  metaLine: string;
  caption: string;
  media?: QueueMedia;
  tags: TagChipProps[];
  /** Optional line under the caption, e.g. the reason changes were requested. */
  note?: string;
};

type Props = {
  item: QueueItem;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onMore?: () => void;
  onOpenMedia?: () => void;
  /** Replaces the default Reject / Approve row. */
  actions?: ReactNode;
  busy?: boolean;
};

/** Moderation card: author row, media, caption, tags and action buttons. */
export function QueueCard({
  item,
  selectable = false,
  selected = false,
  onToggleSelect,
  onApprove,
  onReject,
  onMore,
  onOpenMedia,
  actions,
  busy,
}: Props) {
  const { c, type, layout, shadow } = useCaptureTheme();
  const [playing, setPlaying] = useState(false);
  const showActions = actions !== undefined || onApprove || onReject;

  return (
    <View
      style={[
        styles.card,
        shadow.level1,
        { backgroundColor: c.surfaceCard, borderColor: c.cardBorder, borderRadius: layout.radius.lg, padding: layout.space.md },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.author}>
          {selectable ? <Checkbox checked={selected} onChange={() => onToggleSelect?.()} label={`Select post by ${item.authorName}`} /> : null}
          <AvatarInitials name={item.authorName} />
          <View style={styles.authorText}>
            <View style={styles.nameRow}>
              <Text style={[type.labelLg, { color: c.onSurface }]} numberOfLines={1}>
                {item.authorName}
              </Text>
              {item.authorRole ? <Badge label={item.authorRole} tone={item.roleTone ?? "primary"} /> : null}
            </View>
            <Text style={[type.bodySm, { color: c.onSurfaceVariant }]} numberOfLines={1}>
              {item.metaLine}
            </Text>
          </View>
        </View>
        {onMore ? (
          <Pressable onPress={onMore} style={styles.moreBtn} accessibilityRole="button" accessibilityLabel="More options" hitSlop={6}>
            <MaterialCommunityIcons name="dots-vertical" size={20} color={c.onSurfaceVariant} />
          </Pressable>
        ) : null}
      </View>

      {item.media?.kind === "audio" ? (
        <AudioClip
          title={item.media.title}
          durationLabel={item.media.durationLabel}
          thumbnailUri={item.media.thumbnailUri}
          playing={playing}
          onToggle={() => setPlaying((value) => !value)}
        />
      ) : item.media ? (
        <MediaPreview uri={item.media.uri} kind={item.media.kind} badge={item.media.badge} onPress={onOpenMedia} />
      ) : null}

      <View style={styles.body}>
        <Text style={[type.bodyMd, { color: c.onSurface, lineHeight: 19 }]}>{item.caption}</Text>
        {item.note ? (
          <Text style={[type.bodySm, { color: c.statusDanger }]}>{item.note}</Text>
        ) : null}
        {item.tags.length ? (
          <View style={styles.tags}>
            {item.tags.map((tag, index) => (
              <TagChip key={`${tag.label}-${index}`} {...tag} />
            ))}
          </View>
        ) : null}
      </View>

      {showActions ? (
        <View style={[styles.actions, { borderTopColor: c.surfaceContainer }]}>
          {actions !== undefined ? (
            actions
          ) : (
            <>
              {onReject ? (
                <CaptureButton
                  label="Reject"
                  variant="secondary"
                  size="sm"
                  icon="close"
                  iconColor={c.statusDanger}
                  onPress={onReject}
                  disabled={busy}
                  style={styles.actionBtn}
                />
              ) : null}
              {onApprove ? (
                <CaptureButton label="Approve" variant="success" size="sm" icon="check" onPress={onApprove} disabled={busy} style={styles.actionBtn} />
              ) : null}
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, gap: 12 },
  header: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 8 },
  author: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  authorText: { flex: 1, gap: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  moreBtn: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  body: { gap: 8 },
  tags: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  actions: { flexDirection: "row", gap: 10, paddingTop: 8, borderTopWidth: 1 },
  actionBtn: { flex: 1 },
});
