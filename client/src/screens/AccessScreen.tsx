import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { AvatarInitials, Badge, BottomSheet, EmptyState, ListLoader, OptionRow, SearchField, popupAlert } from "../components/capture";
import { fetchAccessUsers, updateUserRole, type AccessUser } from "../services/api";
import type { User, UserRole } from "../types/app";
import { useCaptureTheme, type CaptureColors } from "../theme/useCaptureTheme";
import { ROLE_OPTIONS, roleLabel, roleTone } from "../utils/permissions";

type Props = { token: string; currentUser: User };

/** Super Admin page: find a person and give or remove access by changing their role. */
export function AccessScreen({ token, currentUser }: Props) {
  const { c, type, shadow, layout } = useCaptureTheme();
  const styles = useMemo(() => getStyles(c), [c]);
  const [users, setUsers] = useState<AccessUser[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [target, setTarget] = useState<AccessUser | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setUsers(await fetchAccessUsers(token));
    } catch (error) {
      popupAlert("Could not load users", (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? users.filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) : users;
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [users, query]);

  const counts = useMemo(() => {
    const base: Record<string, number> = {};
    for (const u of users) base[u.role] = (base[u.role] ?? 0) + 1;
    return base;
  }, [users]);

  function pickRole(role: UserRole) {
    if (!target || target.role === role) {
      setTarget(null);
      return;
    }
    const self = target.id === currentUser.id;
    popupAlert(
      `Change ${self ? "your own" : target.name + "'s"} access?`,
      `${roleLabel(target.role)} → ${roleLabel(role)}${self ? "\n\nThis changes what you can do in the app." : ""}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Change",
          style: role === "super_admin" || self ? "destructive" : "default",
          onPress: () => void applyRole(target, role),
        },
      ]
    );
  }

  async function applyRole(user: AccessUser, role: UserRole) {
    try {
      setSaving(true);
      const updated = await updateUserRole(token, user.id, role);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setTarget(null);
    } catch (error) {
      popupAlert("Could not change access", (error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={[]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <SearchField value={query} onChangeText={setQuery} placeholder="Search by name or email..." size="md" elevated />

        <View style={styles.summary}>
          {ROLE_OPTIONS.map((option) => (
            <View key={option.id} style={[styles.summaryItem, { backgroundColor: c.surfaceCard, borderColor: c.cardBorder }]}>
              <Text style={[type.headlineSm, { color: c.onSurface }]}>{counts[option.id] ?? 0}</Text>
              <Text style={[type.labelSm, { color: c.onSurfaceVariant }]} numberOfLines={1}>
                {option.label}
              </Text>
            </View>
          ))}
        </View>

        {loading && users.length === 0 ? (
          <ListLoader message="Loading people..." />
        ) : visible.length === 0 ? (
          <EmptyState icon="account-search-outline" title="No one matches" message="Try a different name or email." />
        ) : (
          <View style={styles.list}>
            {visible.map((user) => (
              <Pressable
                key={user.id}
                onPress={() => setTarget(user)}
                accessibilityRole="button"
                accessibilityLabel={`Change access for ${user.name}`}
                style={({ pressed }) => [
                  styles.row,
                  shadow.level1,
                  { backgroundColor: pressed ? c.surfaceContainerLow : c.surfaceCard, borderColor: c.cardBorder, borderRadius: layout.radius.md },
                ]}
              >
                <AvatarInitials name={user.name} />
                <View style={styles.rowText}>
                  <Text style={[type.labelLg, { color: c.onSurface }]} numberOfLines={1}>
                    {user.name}
                    {user.id === currentUser.id ? "  (you)" : ""}
                  </Text>
                  <Text style={[type.bodySm, { color: c.onSurfaceVariant }]} numberOfLines={1}>
                    {user.email}
                  </Text>
                </View>
                <Badge label={roleLabel(user.role)} tone={roleTone(user.role)} pill />
                <MaterialCommunityIcons name="chevron-right" size={20} color={c.onSurfaceVariant} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <BottomSheet visible={Boolean(target)} onClose={() => setTarget(null)} title={target?.name ?? ""} subtitle={target?.email}>
        <View style={styles.sheet}>
          {ROLE_OPTIONS.map((option) => (
            <OptionRow
              key={option.id}
              icon={option.id === target?.role ? "check-circle" : "account-outline"}
              label={option.label}
              description={option.description}
              onPress={() => (saving ? undefined : pickRole(option.id))}
            />
          ))}
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

function getStyles(c: CaptureColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: c.surface },
    content: { padding: 16, gap: 14, paddingBottom: 32 },
    summary: { flexDirection: "row", gap: 8 },
    summaryItem: { flex: 1, alignItems: "center", gap: 2, paddingVertical: 10, paddingHorizontal: 4, borderRadius: 12, borderWidth: 1 },
    list: { gap: 10 },
    row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, borderWidth: 1 },
    rowText: { flex: 1, gap: 1 },
    sheet: { gap: 8, paddingBottom: 8 },
    empty: { textAlign: "center", marginTop: 32, color: c.onSurfaceVariant, fontFamily: "Inter_400Regular", fontSize: 14 },
  });
}
