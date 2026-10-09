import { ReactNode, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { CaptureHeader } from "../components";
import { Badge, BottomSheet, CaptureButton, type SelectOption } from "../components/capture";
import type { City, CostCenter, EventItem, ProfileUpdate, User } from "../types/app";
import { useCaptureTheme, type CaptureColors } from "../theme/useCaptureTheme";
import { contentKindOf } from "../utils/eventPresenters";
import appConfig from "../../app.json";

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;

type ProfileScreenProps = {
  user: User;
  /** All events the app has loaded; the user's own uploads are picked out here. */
  events: EventItem[];
  cities: City[];
  costCenters: CostCenter[];
  isAdmin: boolean;
  onOpenAdmin: () => void;
  onSave: (update: ProfileUpdate) => Promise<void>;
  onLogout: () => void;
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

export function ProfileScreen({ user, events, cities, costCenters, isAdmin, onOpenAdmin, onSave, onLogout }: ProfileScreenProps) {
  const { c, type, layout, shadow } = useCaptureTheme();
  const styles = useMemo(() => getStyles(c), [c]);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftName, setDraftName] = useState(user.name);
  const [draftCityId, setDraftCityId] = useState<string | null>(user.cityId ?? null);
  const [draftCostCenterId, setDraftCostCenterId] = useState<string | null>(user.costCenterId ?? null);

  const stats = useMemo(() => {
    const counts = { event: 0, post: 0, story: 0 };
    for (const event of events) if (event.uploadedBy === user.id) counts[contentKindOf(event)] += 1;
    return counts;
  }, [events, user.id]);
  const cityLabel = user.cityName ? [user.cityName, user.cityState].filter(Boolean).join(", ") : null;
  const costCenterLabel = user.costCenterCode
    ? [user.costCenterCode, user.costCenterName].filter(Boolean).join(" • ")
    : null;
  const draftCostCenters = useMemo(
    () => (draftCityId ? costCenters.filter((center) => center.cityId === draftCityId) : costCenters),
    [costCenters, draftCityId]
  );
  const version = (appConfig as { expo?: { version?: string } }).expo?.version ?? "1.0.0";

  function startEditing() {
    setDraftName(user.name);
    setDraftCityId(user.cityId ?? null);
    setDraftCostCenterId(user.costCenterId ?? null);
    setEditing(true);
  }

  function pickCity(cityId: string | null) {
    setDraftCityId(cityId);
    const current = costCenters.find((center) => center.id === draftCostCenterId);
    if (current && cityId && current.cityId !== cityId) setDraftCostCenterId(null);
  }

  function pickCostCenter(id: string | null) {
    setDraftCostCenterId(id);
    const center = costCenters.find((item) => item.id === id);
    if (center?.cityId) setDraftCityId(center.cityId);
  }

  async function save() {
    const name = draftName.trim();
    if (!name) {
      Alert.alert("Name required", "Please enter your name.");
      return;
    }
    try {
      setSaving(true);
      await onSave({ name, cityId: draftCityId, costCenterId: draftCostCenterId });
      setEditing(false);
    } catch (error) {
      Alert.alert("Could not save", (error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function comingSoon(label: string) {
    Alert.alert(label, "This setting is coming soon.");
  }

  const card = [styles.card, shadow.level1, { borderRadius: layout.radius.lg }];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <CaptureHeader
        title={editing ? "Edit profile" : "Profile"}
        onBack={editing ? () => setEditing(false) : undefined}
        right={
          editing ? null : (
            <Pressable
              style={({ pressed }) => [styles.headerBtn, pressed && { backgroundColor: c.surfaceContainer }]}
              onPress={startEditing}
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
            >
              <MaterialCommunityIcons name="pencil-outline" size={22} color={c.onSurface} />
            </Pressable>
          )
        }
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Identity */}
        <View style={[card, styles.hero]}>
          <View style={[styles.heroBand, { backgroundColor: c.primary, borderTopLeftRadius: layout.radius.lg, borderTopRightRadius: layout.radius.lg }]}>
            <View style={[styles.heroSun, { backgroundColor: c.brandSun }]} />
          </View>
          <View style={[styles.avatar, { backgroundColor: c.primaryFixed, borderColor: c.surfaceCard }]}>
            <Text style={[type.headlineLg, { color: c.onPrimaryFixedVariant }]}>{initialsOf(editing ? draftName || user.name : user.name)}</Text>
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

        {editing ? (
          <View style={[card, styles.form]}>
            <View style={styles.field}>
              <Text style={[type.labelSm, styles.label]}>FULL NAME</Text>
              <TextInput
                value={draftName}
                onChangeText={setDraftName}
                placeholder="Your name"
                placeholderTextColor={c.outline}
                autoCapitalize="words"
                style={[type.bodyLg, styles.input, { borderRadius: layout.radius.md }]}
              />
            </View>
            <SelectField
              label="ASSIGNED CITY"
              icon="map-marker-outline"
              noneLabel="No city"
              options={cities.map((city) => ({ id: city.id, label: city.state ? `${city.name}, ${city.state}` : city.name }))}
              valueId={draftCityId}
              onChange={pickCity}
            />
            <SelectField
              label="COST CENTER"
              icon="office-building-outline"
              noneLabel="No cost center"
              options={draftCostCenters.map((center) => ({ id: center.id, label: `${center.code} • ${center.name}` }))}
              valueId={draftCostCenterId}
              onChange={pickCostCenter}
              emptyHint="No cost centers for this city."
            />
            <View style={styles.formActions}>
              <CaptureButton label="Cancel" variant="secondary" onPress={() => setEditing(false)} disabled={saving} style={styles.flex} />
              <CaptureButton label="Save changes" icon="check" onPress={() => void save()} loading={saving} style={styles.flex} />
            </View>
          </View>
        ) : (
          <>
            {/* Contributions */}
            <View style={styles.stats}>
              <StatTile icon="calendar-month" value={stats.event} label="Events" color={c.primary} bg={c.primaryFixed} />
              <StatTile icon="image-multiple" value={stats.post} label="Posts" color={c.tertiary} bg={c.tertiaryFixed} />
              <StatTile icon="book-open-page-variant" value={stats.story} label="Stories" color={c.secondary} bg={c.secondaryFixed} />
            </View>

            <Section title="Details">
              <View style={card}>
                <Row icon="email-outline" label="Email" value={user.email} />
                <Row icon="badge-account-outline" label="Role" value={capitalize(user.role)} />
                <Row icon="map-marker-outline" label="Assigned city" value={cityLabel || "Not set"} />
                <Row icon="office-building-outline" label="Cost center" value={costCenterLabel || "Not set"} last />
              </View>
            </Section>

            <Section title="Settings">
              <View style={card}>
                {isAdmin ? <Row icon="shield-account-outline" label="Admin console" onPress={onOpenAdmin} /> : null}
                <Row icon="bell-outline" label="Notification preferences" onPress={() => comingSoon("Notification preferences")} />
                <Row icon="translate" label="App language" value="English" onPress={() => comingSoon("App language")} />
                <Row icon="lifebuoy" label="Help & coordinator support" onPress={() => comingSoon("Help & coordinator support")} last />
              </View>
            </Section>

            <CaptureButton label="Log out" icon="logout" variant="secondary" iconColor={c.statusDanger} onPress={onLogout} />
            <Text style={[type.bodySm, styles.center, { color: c.onSurfaceVariant }]}>CaptureAkanksha • v{version}</Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
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

type RowProps = { icon: IconName; label: string; value?: string; onPress?: () => void; last?: boolean };

/** Icon, label and value; with onPress it becomes a tappable row with a chevron. */
function Row({ icon, label, value, onPress, last }: RowProps) {
  const { c, type } = useCaptureTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? "button" : undefined}
      style={({ pressed }) => [
        rowStyles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.outlineVariant },
        pressed && { backgroundColor: c.surfaceContainerLow },
      ]}
    >
      <View style={[rowStyles.icon, { backgroundColor: c.surfaceContainerLow }]}>
        <MaterialCommunityIcons name={icon} size={20} color={c.onSurfaceVariant} />
      </View>
      <Text style={[type.labelLg, rowStyles.label, { color: c.onSurface }]}>{label}</Text>
      {value ? (
        <Text style={[type.bodyMd, rowStyles.value, { color: c.onSurfaceVariant }]} numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {onPress ? <MaterialCommunityIcons name="chevron-right" size={20} color={c.outline} /> : null}
    </Pressable>
  );
}

type SelectFieldProps = {
  label: string;
  icon: IconName;
  noneLabel: string;
  options: SelectOption[];
  valueId: string | null;
  onChange: (id: string | null) => void;
  emptyHint?: string;
};

/** Form field that opens a sheet of options; includes a "none" choice. */
function SelectField({ label, icon, noneLabel, options, valueId, onChange, emptyHint }: SelectFieldProps) {
  const { c, type, layout } = useCaptureTheme();
  const [open, setOpen] = useState(false);
  const current = options.find((option) => option.id === valueId)?.label;
  const rows: Array<{ id: string | null; label: string }> = [{ id: null, label: noneLabel }, ...options];

  return (
    <View style={selectStyles.field}>
      <Text style={[type.labelSm, selectStyles.label, { color: c.onSurfaceVariant }]}>{label}</Text>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${current ?? noneLabel}`}
        style={({ pressed }) => [
          selectStyles.control,
          { borderRadius: layout.radius.md, borderColor: c.chipBorder, backgroundColor: pressed ? c.surfaceContainerLow : c.surfaceCard },
        ]}
      >
        <MaterialCommunityIcons name={icon} size={20} color={c.onSurfaceVariant} />
        <Text style={[type.bodyLg, selectStyles.value, { color: current ? c.onSurface : c.outline }]} numberOfLines={1}>
          {current ?? noneLabel}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={20} color={c.onSurfaceVariant} />
      </Pressable>
      {options.length === 0 && emptyHint ? <Text style={[type.bodySm, { color: c.onSurfaceVariant }]}>{emptyHint}</Text> : null}

      <BottomSheet visible={open} onClose={() => setOpen(false)} title={capitalize(label.toLowerCase())}>
        <View style={selectStyles.list}>
          {rows.map((row) => {
            const selected = row.id === valueId;
            return (
              <Pressable
                key={row.id ?? "__none"}
                onPress={() => {
                  onChange(row.id);
                  setOpen(false);
                }}
                style={[selectStyles.option, { borderRadius: layout.radius.md, backgroundColor: selected ? c.surfaceContainer : c.surfaceContainerLow }]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
              >
                <Text style={[type.labelLg, selectStyles.value, { color: c.onSurface }]}>{row.label}</Text>
                {selected ? <MaterialCommunityIcons name="check" size={18} color={c.primary} /> : null}
              </Pressable>
            );
          })}
        </View>
      </BottomSheet>
    </View>
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
    form: { padding: 16, gap: 16 },
    field: { gap: 8 },
    label: { color: c.onSurfaceVariant, letterSpacing: 0.8 },
    input: {
      minHeight: 48,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: c.chipBorder,
      backgroundColor: c.surfaceCard,
      color: c.onSurface,
    },
    formActions: { flexDirection: "row", gap: 12, marginTop: 4 },
    flex: { flex: 1 },
    headerBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
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
  icon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  label: { flexShrink: 0 },
  value: { flex: 1, textAlign: "right" },
});

const selectStyles = StyleSheet.create({
  field: { gap: 8 },
  label: { letterSpacing: 0.8 },
  control: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48, paddingHorizontal: 14, borderWidth: 1 },
  value: { flex: 1 },
  list: { gap: 8, paddingBottom: 8 },
  option: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48, paddingHorizontal: 12 },
});
