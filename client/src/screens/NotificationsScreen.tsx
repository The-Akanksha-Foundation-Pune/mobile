import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { EmptyState, PillTabs, TextButton } from "../components/capture";
import type { AppNotification } from "../hooks/useNotifications";
import { statusToneColor } from "../theme/capture";
import { useCaptureTheme, type CaptureColors } from "../theme/useCaptureTheme";
import { formatRelativeTime } from "../utils/relativeTime";

type Filter = "all" | "unread";

type Props = {
  notifications: AppNotification[];
  unreadCount: number;
  onOpen: (notification: AppNotification) => void;
  onMarkAllRead: () => void;
};

/** Notifications: review outcomes, contributions to your events and new events in your city. */
export function NotificationsScreen({ notifications, unreadCount, onOpen, onMarkAllRead }: Props) {
  const { c, type } = useCaptureTheme();
  const styles = useMemo(() => getStyles(c), [c]);
  const [filter, setFilter] = useState<Filter>("all");

  const visible = filter === "unread" ? notifications.filter((item) => item.unread) : notifications;
  const fresh = visible.filter((item) => item.unread);
  const earlier = visible.filter((item) => !item.unread);

  function renderSection(title: string, items: AppNotification[]) {
    if (items.length === 0) return null;
    return (
      <View style={styles.section}>
        <Text style={[type.labelMd, styles.sectionTitle, { color: c.onSurfaceVariant }]}>{title}</Text>
        <View style={styles.card}>
          {items.map((item, index) => (
            <NotificationRow key={item.id} item={item} divider={index > 0} onPress={() => onOpen(item)} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.toolbar}>
          <View style={styles.tabs}>
            <PillTabs
              tabs={[
                { id: "all", label: "All", count: notifications.length },
                { id: "unread", label: "Unread", count: unreadCount },
              ]}
              activeId={filter}
              onSelect={(id) => setFilter(id as Filter)}
              variant="inverse"
              size="md"
            />
          </View>
          {unreadCount > 0 ? <TextButton label="Mark all read" icon="check-all" onPress={onMarkAllRead} /> : null}
        </View>

        {visible.length === 0 ? (
          <EmptyState
            icon="bell-check-outline"
            title={filter === "unread" ? "You're all caught up" : "No notifications yet"}
            message={
              filter === "unread"
                ? "There's nothing new since you last checked."
                : "Review updates, new posts on your events and events in your city will show up here."
            }
          />
        ) : (
          <>
            {renderSection("New", fresh)}
            {renderSection("Earlier", earlier)}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function NotificationRow({ item, divider, onPress }: { item: AppNotification; divider: boolean; onPress: () => void }) {
  const { c, type } = useCaptureTheme();
  const styles = useMemo(() => getStyles(c), [c]);
  const tone = statusToneColor(c, item.tone);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.unread ? "Unread. " : ""}${item.title}. ${item.message}`}
      style={({ pressed }) => [
        styles.row,
        divider && styles.divider,
        item.unread && { backgroundColor: c.surfaceContainerLow },
        pressed && { backgroundColor: c.surfaceContainer },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: `${tone}1A` }]}>
        <MaterialCommunityIcons name={item.icon} size={20} color={tone} />
      </View>
      <View style={styles.body}>
        <Text style={[item.unread ? type.labelLg : type.bodyMd, { color: c.onSurface }]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[type.bodySm, { color: c.onSurfaceVariant }]} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={[type.labelSm, styles.time, { color: c.outline }]}>{formatRelativeTime(item.at)}</Text>
      </View>
      {item.unread ? <View style={[styles.dot, { backgroundColor: c.primary }]} /> : null}
    </Pressable>
  );
}

function getStyles(c: CaptureColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.surface },
    content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32, gap: 16 },
    toolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
    tabs: { flex: 1 },
    section: { gap: 8 },
    sectionTitle: { textTransform: "uppercase", paddingHorizontal: 4 },
    card: {
      backgroundColor: c.surfaceCard,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: c.cardBorder,
      overflow: "hidden",
    },
    row: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingHorizontal: 16, paddingVertical: 14 },
    divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.chipBorder },
    iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
    body: { flex: 1, gap: 2 },
    time: { marginTop: 4 },
    dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  });
}
