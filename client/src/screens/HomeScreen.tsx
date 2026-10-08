import { useMemo, useState } from "react";
import { Alert, Platform, StyleSheet, Text, View, useColorScheme } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { BottomNav } from "../components";
import type { BottomNavItem } from "../components";
import type {
  City,
  CostCenter,
  EventItem,
  EventType,
  MediaMode,
  ProfileUpdate,
  SelectedMedia,
  User,
} from "../types/app";
import { darkPalette, palette } from "../theme/theme";
import { AddEventScreen } from "./AddEventScreen";
import { ActivityScreen } from "./ActivityScreen";
import { ProfileScreen } from "./ProfileScreen";
import { AdminScreen } from "./AdminScreen";
import { CityPickerScreen } from "./CityPickerScreen";
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
  onSaveEvent: (costCenterId: string | null, cityId?: string | null) => Promise<boolean>;
  onUpdateProfile: (update: ProfileUpdate) => Promise<User>;
};

type OverlayScreen = "add" | "admin" | "profile" | "activity" | null;

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
    onUpdateProfile,
  } = props;

  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [selectedCostCenter, setSelectedCostCenter] = useState<CostCenter | null>(null);
  const [skippedCostCenter, setSkippedCostCenter] = useState(false);
  const [filterCityId, setFilterCityId] = useState<string | null>(user.cityId ?? null);
  const [overlay, setOverlay] = useState<OverlayScreen>(null);
  const isDark = useColorScheme() === "dark";
  const styles = useMemo(() => getStyles(isDark), [isDark]);
  const colors = isDark ? darkPalette : palette;
  const isAdmin = Platform.OS === "web" && user.role === "admin";

  const navItems: BottomNavItem[] = [
    { id: "home", label: "Feed", icon: "newspaper-outline", activeIcon: "newspaper" },
    { id: "events", label: "Events", icon: "calendar-outline", activeIcon: "calendar" },
    { id: "add", label: "Add event", icon: "add", primary: true },
    { id: "activity", label: "Activity", icon: "bar-chart-outline", activeIcon: "bar-chart" },
    { id: "account", label: "Profile", icon: "person-outline", activeIcon: "person" },
  ];

  const filterCity = cities.find((city) => city.id === filterCityId) ?? null;
  const addCity = selectedCity ?? filterCity ?? cities[0] ?? null;
  const userCostCenter = costCenters.find((center) => center.id === user.costCenterId) ?? null;
  // Prefer the cost center picked in this session, else the user's saved one if it fits the city.
  const addCostCenter =
    (selectedCity ? selectedCostCenter : null) ??
    (userCostCenter && addCity && userCostCenter.cityId === addCity.id ? userCostCenter : null);

  async function handleSaveProfile(update: ProfileUpdate) {
    const updated = await onUpdateProfile(update);
    if (update.cityId !== undefined) setFilterCityId(updated.cityId ?? null);
  }

  function goHome() {
    setOverlay(null);
    setSelectedCostCenter(null);
    setSkippedCostCenter(false);
    setSelectedCity(null);
  }

  function handleNavSelect(id: string) {
    if (id === "home") {
      goHome();
    } else if (id === "events") {
      const city = filterCity ?? cities[0] ?? null;
      if (!city) return;
      setOverlay(null);
      setSelectedCostCenter(null);
      setSkippedCostCenter(true);
      setSelectedCity(city);
    } else if (id === "add") {
      if (!addCity) {
        Alert.alert("No city available", "Cities have not loaded yet. Try again in a moment.");
        return;
      }
      setOverlay("add");
    } else if (id === "activity") {
      setOverlay("activity");
    } else if (id === "account") {
      setOverlay("profile");
    }
  }

  function activeNavId() {
    if (overlay === "profile") return "account";
    if (overlay === "activity") return "activity";
    if (selectedCity) return "events";
    return "home";
  }

  function withNav(content: React.ReactNode) {
    return (
      <View style={styles.shell}>
        <View style={styles.shellBody}>{content}</View>
        <BottomNav
          items={navItems}
          activeId={activeNavId()}
          onSelect={handleNavSelect}
        />
      </View>
    );
  }

  if (overlay === "add" && addCity) {
    return (
      <AddEventScreen
        token={token}
        city={addCity}
        costCenter={addCostCenter}
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
          const ok = await onSaveEvent(addCostCenter?.id ?? null, addCity.id);
          if (ok) setOverlay(null);
        }}
      />
    );
  }

  if (overlay === "admin" && isAdmin) {
    return <AdminScreen token={token} onClose={() => setOverlay(null)} />;
  }

  if (overlay === "activity") {
    return withNav(
      <>
        <ActivityScreen events={events} userId={user.id} onBack={() => setOverlay(null)} />
        <StatusBar style="light" />
      </>
    );
  }

  if (overlay === "profile") {
    return withNav(
      <>
        <ProfileScreen
          user={user}
          events={events}
          cities={cities}
          costCenters={costCenters}
          isAdmin={isAdmin}
          onBack={() => setOverlay(null)}
          onOpenAdmin={() => setOverlay("admin")}
          onSave={handleSaveProfile}
          onLogout={onLogout}
        />
        <StatusBar style="light" />
      </>
    );
  }

  if (!selectedCity) {
    return withNav(
      <>
        <CityPickerScreen
          cities={cities}
          costCenters={costCenters}
          events={events}
          userName={user.name}
          selectedCityId={filterCityId}
          onSelectCity={(city) => setFilterCityId((current) => (current === city.id ? null : city.id))}
          onClearCity={() => setFilterCityId(null)}
          onOpenProfile={() => setOverlay("profile")}
        />
        <StatusBar style="light" />
      </>
    );
  }

  return withNav(
    <>
      <EventsHubScreen
        token={token}
        city={selectedCity}
        costCenter={selectedCostCenter}
        isAdmin={isAdmin}
        onGoHome={goHome}
        onChangeCity={goHome}
        onChangeCostCenter={goHome}
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
    shell: { flex: 1, backgroundColor: isDark ? "#0d1322" : "#f4f6fa" },
    shellBody: { flex: 1 },
    safe: { flex: 1, backgroundColor: isDark ? "#0d1322" : "#f4f6fa" },
  });
}
