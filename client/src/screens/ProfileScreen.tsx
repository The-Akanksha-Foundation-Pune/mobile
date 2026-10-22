import { ReactNode, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { Badge, CaptureButton, TextButton } from "../components/capture";
import type { CalendarConnection, EventItem, User } from "../types/app";
import { useCaptureTheme, type CaptureColors } from "../theme/useCaptureTheme";
import { contentKindOf } from "../utils/eventPresenters";
import { can } from "../utils/permissions";
import { PRIVACY_POLICY_URL } from "../config/constants";
import appConfig from "../../app.json";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

/** Google Calendar link, shown to Special Access users only. */
export type ProfileCalendarProps = {
  /** null while the status is still being fetched. */
  connection: CalendarConnection | null;
  connecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onOpenEvents: () => void;
};

type ProfileScreenProps = {
  user: User;
  /** All events the app has loaded; the user's own uploads are picked out here. */
  events: EventItem[];
  isAdmin: boolean;
  onOpenAdmin: () => void;
  canManageAccess?: boolean;
  onOpenAccess?: () => void;
  onLogout: () => void;
  calendar?: ProfileCalendarProps;
};

function capitalize(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function ProfileScreen({ user, events, isAdmin, onOpenAdmin, canManageAccess = false, onOpenAccess, onLogout, calendar }: ProfileScreenProps) {
  const { c, type, layout, shadow } = useCaptureTheme();
  const styles = useMemo(() => getStyles(c), [c]);
  const stats = useMemo(() => {
    const counts = { event: 0, post: 0, story: 0 };
    for (const event of events) if (event.uploadedBy === user.id) counts[contentKindOf(event)] += 1;
    return counts;
  }, [events, user.id]);
  const cityLabel = user.cityName ? [user.cityName, user.cityState].filter(Boolean).join(", ") : null;
  const costCenterLabel = user.costCenterLocked && user.costCenterPath
    ? user.costCenterPath
    : user.costCenterCode
    ? [user.costCenterCode, user.costCenterName].filter(Boolean).join(" • ")
    : null;
  const version = (appConfig as { expo?: { version?: string } }).expo?.version ?? "1.0.0";
  const isSpecialAccess = can(user, "import_events");

  const card = [styles.card, shadow.level1, { borderRadius: layout.radius.lg }];

  return (
    <View style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Identity */}
        <View style={[card, styles.hero]}>
          <View style={[styles.heroBand, { backgroundColor: c.primary, borderTopLeftRadius: layout.radius.lg, borderTopRightRadius: layout.radius.lg }]}>
            <View style={[styles.heroSun, { backgroundColor: c.brandSun }]} />
          </View>
          <View style={[styles.avatar, { backgroundColor: c.primaryFixed, borderColor: c.surfaceCard }]}>
            <Text style={[type.headlineLg, { color: c.onPrimaryFixedVariant }]}>{initialsOf(user.name)}</Text>
          </View>
          <Text style={[type.headlineMd, styles.center, { color: c.onSurface }]} numberOfLines={1}>
            {user.name}
          </Text>
          <Text style={[type.bodyMd, styles.center, { color: c.onSurfaceVariant }]} numberOfLines={1}>
            {user.email}
          </Text>
          <View style={styles.badges}>
            <Badge label={capitalize(user.role)} tone={isAdmin ? "primary" : "tertiary"} pill />
            {user.costCenterCode ? <Badge label={user.costCenterCode} tone="neutral" pill /> : null}
            {user.cityName ? <Badge label={user.cityName} tone="secondary" pill /> : null}
          </View>
        </View>

        {/* Contributions */}
        <View style={styles.stats}>
          <StatTile icon="calendar-month" value={stats.event} label="Events" color={c.primary} bg={c.primaryFixed} />
          <StatTile icon="image-multiple" value={stats.post} label="Posts" color={c.tertiary} bg={c.tertiaryFixed} />
          <StatTile icon="book-open-page-variant" value={stats.story} label="Stories" color={c.secondary} bg={c.secondaryFixed} />
        </View>

        <Section title="Details">
          <View style={card}>
            <Row icon="email-outline" label="Email" value={user.email} expandable />
            {user.employeeCode ? <Row icon="card-account-details-outline" label="Employee ID" value={user.employeeCode} /> : null}
            <Row icon="badge-account-outline" label="Role" value={capitalize(user.role)} />
            <Row icon="map-marker-outline" label="City" value={cityLabel || "Not set"} />
            <Row icon="office-building-outline" label="Cost center" value={costCenterLabel || "Not set"} expandable last />
          </View>
        </Section>

        {isSpecialAccess && calendar ? (
          <Section title="Calendar">
            {calendar.connection?.connected ? (
              <View style={[card, styles.calendarCard]}>
                <View style={styles.calendarRow}>
                  <View style={[styles.calendarIcon, { backgroundColor: c.tertiaryFixed }]}>
                    <MaterialCommunityIcons name="google" size={20} color={c.tertiary} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={[type.labelLg, { color: c.onSurface }]}>Google Calendar</Text>
                    <Text style={[type.bodySm, { color: c.onSurfaceVariant }]} numberOfLines={2}>
                      Connected as {calendar.connection.email}
                    </Text>
                  </View>
                  <Badge label="Connected" tone="success" pill />
                </View>
                <CaptureButton label="View calendar events" icon="calendar-month-outline" onPress={calendar.onOpenEvents} />
                <View style={styles.calendarFooter}>
                  <TextButton label="Disconnect" icon={null} onPress={calendar.onDisconnect} />
                </View>
              </View>
            ) : (
              <CaptureButton
                label="Connect Calendar"
                icon="calendar-sync"
                onPress={calendar.onConnect}
                loading={calendar.connecting}
                disabled={calendar.connection === null}
              />
            )}
          </Section>
        ) : null}

        <Section title="About">
          <View style={card}>
            <Row icon="shield-lock-outline" label="Privacy Policy" onPress={() => void WebBrowser.openBrowserAsync(PRIVACY_POLICY_URL)} last />
          </View>
        </Section>

        <CaptureButton label="Log out" icon="logout" variant="secondary" iconColor={c.statusDanger} onPress={onLogout} />
        <Text style={[type.bodySm, styles.center, { color: c.onSurfaceVariant }]}>CaptureAkanksha • v{version}</Text>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const { c, type } = useCaptureTheme();
  return (
    <View style={sectionStyles.wrap}>
      <Text style={[type.labelSm, sectionStyles.title, { color: c.onSurfaceVariant }]}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

function StatTile({ icon, value, label, color, bg }: { icon: IconName; value: number; label: string; color: string; bg: string }) {
  const { c, type, layout, shadow } = useCaptureTheme();
  return (
    <View style={[tileStyles.tile, shadow.level1, { backgroundColor: c.surfaceCard, borderRadius: layout.radius.lg }]}>
      <View style={[tileStyles.icon, { backgroundColor: bg }]}>
        <MaterialCommunityIcons name={icon} size={20} color={color} />
      </View>
      <Text style={[type.headlineMd, { color: c.onSurface }]}>{value}</Text>
      <Text style={[type.labelSm, { color: c.onSurfaceVariant }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

type RowProps = {
  icon: IconName;
  label: string;
  value?: string;
  onPress?: () => void;
  /** Long values are cut to one line; tapping the row shows the full text. */
  expandable?: boolean;
  last?: boolean;
};

/** Icon, label and value; with onPress it becomes a tappable row with a chevron. */
function Row({ icon, label, value, onPress, expandable, last }: RowProps) {
  const { c, type } = useCaptureTheme();
  const [expanded, setExpanded] = useState(false);
  const toggle = expandable && value ? () => setExpanded((open) => !open) : undefined;
  const press = onPress ?? toggle;
  return (
    <Pressable
      onPress={press}
      disabled={!press}
      accessibilityRole={press ? "button" : undefined}
      accessibilityState={toggle ? { expanded } : undefined}
      style={({ pressed }) => [
        rowStyles.row,
        expanded && rowStyles.rowExpanded,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.outlineVariant },
        pressed && { backgroundColor: c.surfaceContainerLow },
      ]}
    >
      <View style={[rowStyles.icon, { backgroundColor: c.surfaceContainerLow }]}>
        <MaterialCommunityIcons name={icon} size={20} color={c.onSurfaceVariant} />
      </View>
      <Text style={[type.labelLg, rowStyles.label, { color: c.onSurface }]}>{label}</Text>
      {value ? (
        <Text style={[type.bodyMd, rowStyles.value, { color: c.onSurfaceVariant }]} numberOfLines={expanded ? undefined : 1}>
          {value}
        </Text>
      ) : null}
      {onPress ? <MaterialCommunityIcons name="chevron-right" size={20} color={c.outline} /> : null}
    </Pressable>
  );
}

function getStyles(c: CaptureColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.surface },
    content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32, gap: 16 },
    card: { backgroundColor: c.surfaceCard, overflow: "hidden" },
    hero: { alignItems: "center", paddingBottom: 20, gap: 4 },
    heroBand: { alignSelf: "stretch", height: 72, overflow: "hidden" },
    heroSun: { position: "absolute", width: 120, height: 120, borderRadius: 60, right: -30, top: -50, opacity: 0.9 },
    avatar: {
      width: 92,
      height: 92,
      borderRadius: 46,
      borderWidth: 4,
      marginTop: -46,
      marginBottom: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    center: { textAlign: "center", paddingHorizontal: 16 },
    badges: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 10, paddingHorizontal: 16 },
    stats: { flexDirection: "row", gap: 12 },
    flex: { flex: 1 },
    calendarCard: { padding: 16, gap: 14 },
    calendarRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    calendarIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    calendarFooter: { alignItems: "center" },
  });
}

const sectionStyles = StyleSheet.create({
  wrap: { gap: 8 },
  title: { letterSpacing: 0.8, paddingHorizontal: 4 },
});

const tileStyles = StyleSheet.create({
  tile: { flex: 1, alignItems: "center", paddingVertical: 14, paddingHorizontal: 8, gap: 4 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 4 },
});

const rowStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 60, paddingHorizontal: 16 },
  rowExpanded: { paddingVertical: 12 },
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  label: { flexShrink: 0 },
  value: { flex: 1, textAlign: "right" },
});
