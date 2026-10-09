import { Pressable, StyleSheet, Text, View } from "react-native";
import { AvatarInitials } from "./AvatarInitials";
import { HeroMedia } from "./HeroMedia";
import { TextButton } from "./TextButton";
import { useCaptureTheme } from "../../theme/useCaptureTheme";

type Props = {
  title: string;
  excerpt?: string;
  imageUri?: string;
  authorName: string;
  authorRole?: string;
  actionLabel?: string;
  onPress?: () => void;
};

/** Directory card for a story: banner with the title, a quoted excerpt and the author. */
export function StoryCard({ title, excerpt, imageUri, authorName, authorRole, actionLabel = "Read Story", onPress }: Props) {
  const { c, type, layout, shadow } = useCaptureTheme();
  const quoted = excerpt ? (excerpt.startsWith("“") || excerpt.startsWith('"') ? excerpt : `“${excerpt}”`) : "";

  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[styles.card, shadow.level1, { backgroundColor: c.surfaceCard, borderRadius: layout.radius.md }]}>
      <HeroMedia uri={imageUri} badge={{ icon: "book-open-page-variant", label: "Deep Story", iconColor: c.brandSun }}>
        <Text style={[type.headlineSm, styles.heroTitle]} numberOfLines={2}>
          {title}
        </Text>
      </HeroMedia>
      <View style={styles.body}>
        {quoted ? (
          <Text style={[type.bodySm, styles.excerpt, { color: c.onSurfaceVariant }]} numberOfLines={2}>
            {quoted}
          </Text>
        ) : null}
        <View style={[styles.footer, { borderTopColor: c.cardBorder }]}>
          <View style={styles.author}>
            <AvatarInitials name={authorName} size={24} tone="secondary" />
            <Text style={[type.labelSm, { color: c.onSurfaceVariant }]} numberOfLines={1}>
              {authorRole ? `${authorName} • ${authorRole}` : authorName}
            </Text>
          </View>
          {onPress ? <TextButton label={actionLabel} icon="arrow-right" onPress={onPress} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { overflow: "hidden" },
  heroTitle: { color: "#fff" },
  body: { padding: 16, gap: 12 },
  excerpt: { lineHeight: 20 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, paddingTop: 6, borderTopWidth: 1 },
  author: { flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 },
});
