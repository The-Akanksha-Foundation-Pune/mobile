import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppButton, AppHeader, FormField, SelectChip } from "../components";
import type { City, CostCenter, EventItem, ProfileUpdate, User } from "../types/app";
import { darkPalette, palette } from "../theme/theme";
import { layout } from "../theme/layout";
import appConfig from "../../app.json";

type ProfileScreenProps = {
  user: User;
  /** All events the app has loaded; the user's own uploads are picked out here. */
  events: EventItem[];
  cities: City[];
  costCenters: CostCenter[];
  isAdmin: boolean;
  onBack: () => void;
  onOpenAdmin: () => void;
  onSave: (update: ProfileUpdate) => Promise<void>;
  onLogout: () => void;
};

function capitalize(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

export function ProfileScreen({
  user,
  events,
  cities,
  costCenters,
  isAdmin,
  onBack,
  onOpenAdmin,
  onSave,
  onLogout,
}: ProfileScreenProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draftName, setDraftName] = useState(user.name);
  const [draftCityId, setDraftCityId] = useState<string | null>(user.cityId ?? null);
  const [draftCostCenterId, setDraftCostCenterId] = useState<string | null>(user.costCenterId ?? null);
  const isDark = useColorScheme() === "dark";
  const styles = useMemo(() => getStyles(isDark), [isDark]);
  const colors = isDark ? darkPalette : palette;

  const mine = useMemo(() => events.filter((event) => event.uploadedBy === user.id), [events, user.id]);
  const doneCount = mine.filter((event) => event.eventStatus === "complete").length;
  const upcomingCount = mine.filter((event) => event.eventStatus === "upcoming").length;
  const cityLabel = user.cityName ? [user.cityName, user.cityState].filter(Boolean).join(", ") : null;
  const costCenterCode = user.costCenterCode || null;
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

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AppHeader
        title="My account"
        onBack={editing ? () => setEditing(false) : onBack}
        right={
          editing ? null : (
            <Pressable
              style={styles.headerBtn}
              onPress={startEditing}
              accessibilityRole="button"
              accessibilityLabel="Edit profile"
            >
              <Ionicons name="create-outline" size={22} color="#fff" />
            </Pressable>
          )
        }
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user.name.slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={styles.verified}>
              <Ionicons name="checkmark" size={14} color="#fff" />
            </View>
          </View>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email} numberOfLines={1}>
            {user.email}
          </Text>
          <View style={styles.pillRow}>
            <View style={styles.rolePill}>
              <View style={styles.roleDot} />
              <Text style={styles.rolePillText}>Active {capitalize(user.role)}</Text>
            </View>
            {costCenterCode ? (
              <View style={styles.codePill}>
                <Text style={styles.codePillText}>{costCenterCode}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {editing ? (
          <View style={styles.card}>
            <FormField
              label="Name"
              value={draftName}
              onChangeText={setDraftName}
              placeholder="Your name"
              autoCapitalize="words"
            />
            <Text style={styles.editLabel}>Assigned city</Text>
            <View style={styles.chipWrap}>
              <SelectChip label="None" isActive={draftCityId === null} onPress={() => pickCity(null)} />
              {cities.map((city) => (
                <SelectChip
                  key={city.id}
                  label={city.name}
                  isActive={draftCityId === city.id}
                  onPress={() => pickCity(city.id)}
                />
              ))}
            </View>
            <Text style={styles.editLabel}>Cost center</Text>
            <View style={styles.chipWrap}>
              <SelectChip
                label="None"
                isActive={draftCostCenterId === null}
                onPress={() => setDraftCostCenterId(null)}
              />
              {draftCostCenters.map((center) => (
                <SelectChip
                  key={center.id}
                  label={center.code}
                  isActive={draftCostCenterId === center.id}
                  onPress={() => {
                    setDraftCostCenterId(center.id);
                    if (center.cityId) setDraftCityId(center.cityId);
                  }}
                />
              ))}
            </View>
            {draftCostCenters.length === 0 ? (
              <Text style={styles.hint}>No cost centers for this city.</Text>
            ) : null}
            <View style={styles.editActions}>
              <AppButton label={saving ? "Saving..." : "Save changes"} onPress={() => void save()} disabled={saving} />
              <AppButton label="Cancel" variant="muted" onPress={() => setEditing(false)} disabled={saving} />
            </View>
          </View>
        ) : (
          <>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: isDark ? "#3a1c24" : "#fdeaec" }]}>
              <Ionicons name="calendar" size={22} color={colors.brand} />
            </View>
            <View>
              <Text style={styles.statNumber}>{doneCount}</Text>
              <Text style={styles.statLabel}>EVENTS DONE</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIcon, { backgroundColor: isDark ? "#1c2a45" : "#e8ecfd" }]}>
              <Ionicons name="time" size={22} color={isDark ? "#8fb0ff" : "#1e3a8a"} />
            </View>
            <View>
              <Text style={styles.statNumber}>{upcomingCount}</Text>
              <Text style={styles.statLabel}>UPCOMING</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Ionicons name="id-card-outline" size={20} color={colors.inkSoft} />
            <Text style={styles.infoLabel}>Role</Text>
            <View style={styles.valuePill}>
              <Text style={styles.valuePillText}>{user.role}</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={20} color={colors.inkSoft} />
            <Text style={styles.infoLabel}>Assigned location</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {cityLabel || "Not set"}
            </Text>
          </View>
          <View style={[styles.infoRow, styles.infoRowLast]}>
            <Ionicons name="business-outline" size={20} color={colors.inkSoft} />
            <Text style={styles.infoLabel}>Cost center</Text>
            {costCenterCode ? (
              <View style={styles.monoPill}>
                <Text style={styles.monoPillText}>{costCenterCode}</Text>
              </View>
            ) : (
              <Text style={styles.infoValue}>Not set</Text>
            )}
          </View>
        </View>

          </>
        )}

        {!editing ? (
          <View style={styles.card}>
            {isAdmin ? (
              <Pressable style={styles.menuRow} onPress={onOpenAdmin} accessibilityRole="button">
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.inkSoft} />
                <Text style={styles.menuText}>Admin console</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
              </Pressable>
            ) : null}
            <Pressable
              style={styles.menuRow}
              onPress={() => comingSoon("Notification Preferences")}
              accessibilityRole="button"
            >
              <Ionicons name="notifications-outline" size={20} color={colors.inkSoft} />
              <Text style={styles.menuText}>Notification Preferences</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
            </Pressable>
            <Pressable style={styles.menuRow} onPress={() => comingSoon("App Language")} accessibilityRole="button">
              <Ionicons name="language-outline" size={20} color={colors.inkSoft} />
              <Text style={styles.menuText}>App Language</Text>
              <Text style={styles.menuValue}>English (EN)</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
            </Pressable>
            <Pressable
              style={[styles.menuRow, styles.menuRowLast]}
              onPress={() => comingSoon("Help & Coordinator Support")}
              accessibilityRole="button"
            >
              <Ionicons name="help-circle-outline" size={20} color={colors.inkSoft} />
              <Text style={styles.menuText}>Help & Coordinator Support</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.inkSoft} />
            </Pressable>
          </View>
        ) : null}

        {!editing ? (
          <>
            <Pressable
              style={({ pressed }) => [styles.logout, pressed && styles.logoutPressed]}
              onPress={onLogout}
              accessibilityRole="button"
            >
              <Ionicons name="log-out-outline" size={22} color="#fff" />
              <Text style={styles.logoutText}>Logout</Text>
            </Pressable>
            <Text style={styles.version}>CaptureAkanksha • v{version}</Text>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function getStyles(isDark: boolean) {
  const colors = isDark ? darkPalette : palette;
  const cardBase = {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  } as const;
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: isDark ? "#0d1322" : "#f4f6fa" },
    content: { padding: layout.screenPadding, gap: 14, paddingBottom: 28 },
    card: { ...cardBase, paddingHorizontal: 16, paddingVertical: 16, alignItems: "stretch" },
    avatarRing: {
      alignSelf: "center",
      width: 96,
      height: 96,
      borderRadius: 48,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 3,
      borderColor: isDark ? "#2a3a58" : "#eef1f7",
    },
    avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#253961" : "#e3e8f3",
    },
    avatarText: { fontSize: 34, fontWeight: "800", color: isDark ? "#c5d9ff" : "#1e3a8a" },
    verified: {
      position: "absolute",
      right: 2,
      bottom: 4,
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.success,
      borderWidth: 3,
      borderColor: colors.surface,
    },
    name: { marginTop: 12, fontSize: 22, fontWeight: "800", color: colors.ink, textAlign: "center" },
    email: { marginTop: 4, fontSize: 13, color: colors.inkSoft, textAlign: "center" },
    pillRow: { flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 12, flexWrap: "wrap" },
    rolePill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: isDark ? "rgba(74,222,128,0.14)" : "#e6f6ec",
      borderWidth: 1,
      borderColor: isDark ? "rgba(74,222,128,0.3)" : "#bfe6cd",
    },
    roleDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.success },
    rolePillText: { fontSize: 13, fontWeight: "800", color: colors.success },
    codePill: {
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: isDark ? "#1a2640" : "#f1f3f8",
      borderWidth: 1,
      borderColor: colors.border,
    },
    codePillText: { fontSize: 13, fontWeight: "700", color: colors.inkSoft },
    statsRow: { flexDirection: "row", gap: 12 },
    statCard: {
      ...cardBase,
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    statIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
    statNumber: { fontSize: 24, fontWeight: "800", color: colors.ink, lineHeight: 28 },
    statLabel: { fontSize: 11, fontWeight: "700", color: colors.inkSoft, letterSpacing: 0.6 },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      minHeight: 54,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    infoRowLast: { borderBottomWidth: 0 },
    infoLabel: { flex: 1, fontSize: 15, fontWeight: "700", color: colors.ink },
    infoValue: { flexShrink: 1, fontSize: 15, color: colors.ink, textAlign: "right" },
    valuePill: {
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: isDark ? "#1a2640" : "#eef1f7",
    },
    valuePillText: { fontSize: 14, fontWeight: "800", color: colors.ink },
    monoPill: {
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: isDark ? "#1a2640" : "#f7f8fb",
    },
    monoPillText: { fontSize: 13, fontWeight: "700", color: colors.ink, fontFamily: "Courier" },
    headerBtn: {
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
    },
    menuRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      minHeight: 56,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    menuRowLast: { borderBottomWidth: 0 },
    menuText: { flex: 1, fontSize: 15, color: colors.ink },
    menuValue: { fontSize: 13, color: colors.inkSoft },
    editLabel: { marginTop: 14, marginBottom: 8, fontSize: 13, fontWeight: "700", color: colors.inkSoft },
    chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    hint: { marginTop: 8, fontSize: 12, color: colors.inkSoft },
    editActions: { marginTop: 18, gap: 10 },
    logout: {
      marginTop: 6,
      minHeight: 52,
      borderRadius: 16,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      backgroundColor: "#1e3a8a",
    },
    logoutPressed: { opacity: 0.9 },
    logoutText: { fontSize: 16, fontWeight: "800", color: "#fff" },
    version: { textAlign: "center", fontSize: 12, color: colors.inkSoft },
  });
}
