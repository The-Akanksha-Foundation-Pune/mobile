import { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View, useColorScheme } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppButton } from "../components";
import type {
  City,
  CostCenter,
  EventItem,
  EventType,
  MediaMode,
  SelectedMedia,
  User,
} from "../types/app";
import { darkPalette, palette } from "../theme/theme";
import { AddEventScreen } from "./AddEventScreen";
import { AdminScreen } from "./AdminScreen";
import { CityPickerScreen } from "./CityPickerScreen";
import { CostCenterPickerScreen } from "./CostCenterPickerScreen";
import { EventsHubScreen } from "./EventsHubScreen";

type HomeScreenProps = {
  token: string;
  user: User;
  cities: City[];
  costCenters: CostCenter[];
  events: EventItem[];
  eventTypes: EventType[];
  selectedTypeId: string;
  eventTitle: string;
  caption: string;
  eventDate: string;
  eventLocation: string;
  mediaType: MediaMode;
  media: SelectedMedia;
  isLoading: boolean;
  onLogout: () => void;
  onSelectMediaType: (next: MediaMode) => void;
  onSelectType: (typeId: string) => void;
  onChangeEventDate: (next: string) => void;
  onChangeEventTitle: (next: string) => void;
  onChangeCaption: (next: string) => void;
  onChangeEventLocation: (next: string) => void;
  onCaptureMedia: () => void;
  onSaveEvent: (costCenterId: string, cityId?: string | null) => Promise<boolean>;
};

type OverlayScreen = "add" | "admin" | "profile" | null;

export function HomeScreen(props: HomeScreenProps) {
  const {
    token,
    user,
    cities,
    costCenters,
    events,
    eventTypes,
    selectedTypeId,
    eventTitle,
    caption,
    eventDate,
    eventLocation,
    mediaType,
    media,
    isLoading,
    onLogout,
    onSelectMediaType,
    onSelectType,
    onChangeEventDate,
    onChangeEventTitle,
    onChangeCaption,
    onChangeEventLocation,
    onCaptureMedia,
    onSaveEvent,
  } = props;

  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [selectedCostCenter, setSelectedCostCenter] = useState<CostCenter | null>(null);
  const [overlay, setOverlay] = useState<OverlayScreen>(null);
  const isDark = useColorScheme() === "dark";
  const styles = useMemo(() => getStyles(isDark), [isDark]);
  const colors = isDark ? darkPalette : palette;
  const isAdmin = Platform.OS === "web" && user.role === "admin";

  const costCentersForCity = useMemo(() => {
    if (!selectedCity) return [];
    return costCenters.filter((cc) => cc.cityId === selectedCity.id);
  }, [costCenters, selectedCity]);

  if (overlay === "add" && selectedCostCenter && selectedCity) {
    return (
      <AddEventScreen
        token={token}
        city={selectedCity}
        costCenter={selectedCostCenter}
        eventTypes={eventTypes}
        selectedTypeId={selectedTypeId}
        eventTitle={eventTitle}
        caption={caption}
        eventDate={eventDate}
        mediaType={mediaType}
        media={media}
        isLoading={isLoading}
        onClose={() => setOverlay(null)}
        onSelectMediaType={onSelectMediaType}
        onSelectType={onSelectType}
        onChangeEventDate={onChangeEventDate}
        onChangeEventTitle={onChangeEventTitle}
        onChangeCaption={onChangeCaption}
        onChangeLocation={onChangeEventLocation}
        onCaptureMedia={onCaptureMedia}
        onSaveEvent={async () => {
          const ok = await onSaveEvent(selectedCostCenter.id, selectedCity.id);
          if (ok) setOverlay(null);
        }}
      />
    );
  }

  if (overlay === "admin" && isAdmin) {
    return <AdminScreen token={token} onClose={() => setOverlay(null)} />;
  }

  if (overlay === "profile") {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.profileHeader}>
          <Pressable onPress={() => setOverlay(null)}>
            <Ionicons name="arrow-back" size={22} color={colors.ink} />
          </Pressable>
          <Text style={styles.profileTitle}>Profile</Text>
          <View style={{ width: 22 }} />
        </View>
        <View style={styles.profileBody}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user.name.slice(0, 1).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{user.name}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <Text style={styles.role}>Role: {user.role}</Text>
          {selectedCity ? <Text style={styles.meta}>City: {selectedCity.name}</Text> : null}
          {selectedCostCenter ? (
            <Text style={styles.meta}>
              Cost center: {selectedCostCenter.name} ({selectedCostCenter.code})
            </Text>
          ) : null}
          <AppButton label="Logout" variant="secondary" iconName="log-out-outline" onPress={onLogout} />
        </View>
        <StatusBar style={isDark ? "light" : "dark"} />
      </SafeAreaView>
    );
  }

  if (!selectedCity) {
    return (
      <>
        <CityPickerScreen
          cities={cities}
          costCenters={costCenters}
          events={events}
          userName={user.name}
          onSelectCity={setSelectedCity}
          onOpenProfile={() => setOverlay("profile")}
        />
        <StatusBar style="light" />
      </>
    );
  }

  if (!selectedCostCenter) {
    return (
      <>
        <CostCenterPickerScreen
          selectedCity={selectedCity}
          costCenters={costCentersForCity}
          userName={user.name}
          onBack={() => setSelectedCity(null)}
          onSelectCostCenter={setSelectedCostCenter}
        />
        <StatusBar style="light" />
      </>
    );
  }

  return (
    <>
      <EventsHubScreen
        token={token}
        city={selectedCity}
        costCenter={selectedCostCenter}
        isAdmin={isAdmin}
        onGoHome={() => {
          setOverlay(null);
          setSelectedCostCenter(null);
          setSelectedCity(null);
        }}
        onChangeCity={() => {
          setSelectedCostCenter(null);
          setSelectedCity(null);
        }}
        onChangeCostCenter={() => setSelectedCostCenter(null)}
        onOpenAdd={() => setOverlay("add")}
        onOpenAdmin={() => setOverlay("admin")}
        onOpenProfile={() => setOverlay("profile")}
      />
      <StatusBar style="light" />
    </>
  );
}

function getStyles(isDark: boolean) {
  const colors = isDark ? darkPalette : palette;
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: isDark ? "#0d1322" : "#f4f6fa" },
    profileHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    profileTitle: { fontSize: 16, fontWeight: "800", color: colors.ink },
    profileBody: { padding: 20, gap: 10, alignItems: "flex-start" },
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#253961" : "#e7efff",
    },
    avatarText: { fontSize: 24, fontWeight: "800", color: isDark ? "#c5d9ff" : "#2f57ca" },
    name: { fontSize: 22, fontWeight: "800", color: colors.ink },
    email: { fontSize: 14, color: colors.inkSoft },
    role: { fontSize: 13, color: colors.inkSoft },
    meta: { fontSize: 13, color: colors.inkSoft, marginBottom: 8 },
  });
}
