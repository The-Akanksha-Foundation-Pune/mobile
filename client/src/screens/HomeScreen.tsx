import { ComponentProps, useMemo, useState } from "react";
import { Alert, Platform, StyleSheet, Text, View, useColorScheme } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { CaptureHeader, CaptureLayout } from "../components";
import { BottomSheet, OptionRow, PillTabs } from "../components/capture";
import { formatEventDate } from "../utils/eventPresenters";
import type { CaptureTab } from "../components";
import type {
  City,
  CostCenter,
  EventItem,
  EventType,
  ContentKind,
  MediaMode,
  ProfileUpdate,
  SelectedMedia,
  User,
} from "../types/app";
import { darkPalette, palette } from "../theme/theme";
import { AddEventScreen } from "./AddEventScreen";
import { ActivityScreen } from "./ActivityScreen";
import { ProfileScreen } from "./ProfileScreen";
import { ReviewQueueScreen } from "./ReviewQueueScreen";
import { EventHubScreen } from "./EventHubScreen";
import { PostDetailScreen } from "./PostDetailScreen";
import { StoryDetailScreen } from "./StoryDetailScreen";
import { AdminScreen } from "./AdminScreen";
import { FeedScreen } from "./FeedScreen";
import { EventsScreen } from "./EventsScreen";

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
  onSaveEvent: (
    costCenterId: string | null,
    cityId?: string | null,
    options?: { kind?: ContentKind; parentEventId?: string; body?: string }
  ) => Promise<boolean>;
  body: string;
  onChangeBody: (next: string) => void;
  onUpdateProfile: (update: ProfileUpdate) => Promise<User>;
};

type DetailRef = { kind: ContentKind; id: string };
type AddTarget = { kind: ContentKind; parentEvent: EventItem | null };

type OverlayScreen = "add" | "admin" | "profile" | "activity" | "events" | null;

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
    body,
    onChangeBody,
    onUpdateProfile,
  } = props;

  const [filterCityId, setFilterCityId] = useState<string | null>(user.cityId ?? null);
  const [detailStack, setDetailStack] = useState<DetailRef[]>([]);
  const [addTarget, setAddTarget] = useState<AddTarget>({ kind: "event", parentEvent: null });
  const [chooserOpen, setChooserOpen] = useState(false);
  const [eventPickerOpen, setEventPickerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const detail = detailStack[detailStack.length - 1] ?? null;
  const [overlay, setOverlay] = useState<OverlayScreen>(null);
  const [activityView, setActivityView] = useState<"mine" | "review">("mine");
  const isDark = useColorScheme() === "dark";
  const styles = useMemo(() => getStyles(isDark), [isDark]);
  const colors = isDark ? darkPalette : palette;
  const isAdmin = user.role === "admin";

  const navItems: CaptureTab[] = [
    { id: "home", label: "Feed", icon: "home-outline", activeIcon: "home" },
    { id: "events", label: "Events", icon: "calendar-month-outline", activeIcon: "calendar-month" },
    { id: "add", label: "Capture", icon: "plus", primary: true },
    { id: "activity", label: "My activity", icon: "history" },
    { id: "account", label: "Profile", icon: "account-circle-outline", activeIcon: "account-circle" },
  ];

  const filterCity = cities.find((city) => city.id === filterCityId) ?? null;
  const addCity = filterCity ?? cities[0] ?? null;
  const userCostCenter = costCenters.find((center) => center.id === user.costCenterId) ?? null;
  // Use the user's saved cost center when it belongs to the city being added to.
  const addCostCenter = userCostCenter && addCity && userCostCenter.cityId === addCity.id ? userCostCenter : null;

  async function handleSaveProfile(update: ProfileUpdate) {
    const updated = await onUpdateProfile(update);
    if (update.cityId !== undefined) setFilterCityId(updated.cityId ?? null);
  }

  function openDetail(kind: ContentKind, id: string) {
    setDetailStack((stack) => [...stack, { kind, id }]);
  }

  function closeDetail() {
    setDetailStack((stack) => stack.slice(0, -1));
  }

  function startAdd(kind: ContentKind, parentEvent: EventItem | null = null) {
    setChooserOpen(false);
    setEventPickerOpen(false);
    setAddTarget({ kind, parentEvent });
    setOverlay("add");
  }

  function goHome() {
    setDetailStack([]);
    setOverlay(null);
  }

  function handleNavSelect(id: string) {
    if (id === "home") {
      goHome();
    } else if (id === "events") {
      setDetailStack([]);
      setOverlay("events");
    } else if (id === "add") {
      if (!addCity) {
        Alert.alert("No city available", "Cities have not loaded yet. Try again in a moment.");
        return;
      }
      setChooserOpen(true);
    } else if (id === "activity") {
      setDetailStack([]);
      setOverlay("activity");
    } else if (id === "account") {
      setDetailStack([]);
      setOverlay("profile");
    }
  }

  function activeNavId() {
    if (overlay === "profile") return "account";
    if (overlay === "activity") return "activity";
    if (overlay === "events") return "events";
    return "home";
  }

  function showNotifications() {
    Alert.alert("Notifications", "You have no new notifications.");
  }

  const eventChoices = events
    .filter((event) => (event.kind ?? "event") === "event")
    .sort((a, b) => b.eventDate.localeCompare(a.eventDate));

  /** Sheets behind the "+" button: what to capture, and which event to attach to. */
  const captureSheets = (
    <>
      <BottomSheet visible={chooserOpen} onClose={() => setChooserOpen(false)} title="Capture a milestone">
        <View style={styles.chooser}>
          <OptionRow icon="calendar-plus" label="Create a new event" description="Start an event others can add posts and stories to" onPress={() => startAdd("event")} />
          <OptionRow
            icon="image-plus"
            label="Add to an existing event"
            description="Post a photo or video under an event"
            onPress={() => {
              setChooserOpen(false);
              setEventPickerOpen(true);
            }}
          />
          <OptionRow icon="book-open-page-variant" label="Capture a story" description="Write a longer student story" onPress={() => startAdd("story")} />
        </View>
      </BottomSheet>
      <BottomSheet visible={eventPickerOpen} onClose={() => setEventPickerOpen(false)} title="Choose an event">
        <View style={styles.chooser}>
          {eventChoices.length === 0 ? (
            <Text style={styles.chooserEmpty}>No events yet. Create one first.</Text>
          ) : (
            eventChoices.map((event) => (
              <OptionRow
                key={event.id}
                icon="calendar-month"
                label={event.title || "Untitled event"}
                description={`${formatEventDate(event.eventDate)}${event.cityName ? ` • ${event.cityName}` : ""}`}
                onPress={() => startAdd("post", event)}
              />
            ))
          )}
        </View>
      </BottomSheet>
      <BottomSheet visible={menuOpen} onClose={() => setMenuOpen(false)} title="More">
        <View style={styles.chooser}>
          <OptionRow
            icon="account-circle-outline"
            label="My profile"
            description="Edit your name, city and cost center"
            onPress={() => {
              setMenuOpen(false);
              setDetailStack([]);
              setOverlay("profile");
            }}
          />
          {isAdmin ? (
            <OptionRow
              icon="shield-account-outline"
              label="Admin panel"
              description="Manage cities, cost centers and event types"
              onPress={() => {
                setMenuOpen(false);
                setOverlay("admin");
              }}
            />
          ) : null}
          <OptionRow
            icon="logout"
            label="Log out"
            onPress={() => {
              setMenuOpen(false);
              onLogout();
            }}
          />
        </View>
      </BottomSheet>
    </>
  );

  /** Wraps a screen in the shared layout: header on top, bottom bar underneath. */
  function withNav(content: React.ReactNode, header: ComponentProps<typeof CaptureHeader> | null = null) {
    return (
      <CaptureLayout
        header={header ? { ...header, onMore: () => setMenuOpen(true) } : null}
        tabs={{ items: navItems, activeId: activeNavId(), onSelect: handleNavSelect }}
      >
        {content}
        {captureSheets}
      </CaptureLayout>
    );
  }

  const addCityForTarget = addTarget.parentEvent
    ? cities.find((city) => city.id === addTarget.parentEvent?.cityId) ?? addCity
    : addCity;

  if (overlay === "add" && addCityForTarget) {
    return (
      <AddEventScreen
        token={token}
        city={addCityForTarget}
        costCenter={addTarget.parentEvent ? null : addCostCenter}
        mode={addTarget.kind}
        parentEvent={addTarget.parentEvent}
        body={body}
        onChangeBody={onChangeBody}
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
          const parent = addTarget.parentEvent;
          const ok = await onSaveEvent(parent ? null : addCostCenter?.id ?? null, parent ? null : addCityForTarget.id, {
            kind: addTarget.kind,
            parentEventId: parent?.id,
            body,
          });
          if (ok) {
            setOverlay(null);
            if (parent) setDetailStack([{ kind: "event", id: parent.id }]);
            setAddTarget({ kind: "event", parentEvent: null });
          }
        }}
      />
    );
  }

  if (overlay === "admin" && isAdmin) {
    return <AdminScreen token={token} onClose={() => setOverlay(null)} />;
  }

  if (detail) {
    const record = events.find((event) => event.id === detail.id) ?? null;
    const headerBase = { subtitle: "", onBack: closeDetail, onNotifications: showNotifications };
    if (detail.kind === "event") {
      return withNav(
        <>
          <EventHubScreen
            token={token}
            eventId={detail.id}
            initial={record}
            refreshKey={events.length}
            onOpenPost={(post) => openDetail("post", post.id)}
            onOpenStory={(story) => openDetail("story", story.id)}
            onContribute={(kind, parent) => startAdd(kind, parent)}
          />
          <StatusBar style="dark" />
        </>,
        { ...headerBase, title: "Event" }
      );
    }
    if (detail.kind === "story") {
      return withNav(
        <>
          <StoryDetailScreen story={record} onOpenParent={(id) => openDetail("event", id)} />
          <StatusBar style="dark" />
        </>,
        { ...headerBase, title: "Story" }
      );
    }
    return withNav(
      <>
        <PostDetailScreen post={record} onOpenParent={(id) => openDetail("event", id)} />
        <StatusBar style="dark" />
      </>,
      { ...headerBase, title: "Post" }
    );
  }

  if (overlay === "activity") {
    const showReview = isAdmin && activityView === "review";
    return withNav(
      <>
        {isAdmin ? (
          <View style={styles.activitySwitch}>
            <PillTabs
              tabs={[
                { id: "mine", label: "My activity" },
                { id: "review", label: "Review queue" },
              ]}
              activeId={activityView}
              onSelect={(id) => setActivityView(id as "mine" | "review")}
            />
          </View>
        ) : null}
        {showReview ? (
          <ReviewQueueScreen token={token} cities={cities} eventTypes={eventTypes} />
        ) : (
          <ActivityScreen
            events={events}
            userId={user.id}
            onOpenEvent={(event) => openDetail(event.kind ?? "event", event.id)}
            onCreate={() => handleNavSelect("add")}
          />
        )}
        <StatusBar style="dark" />
      </>,
      {
        title: showReview ? "Review queue" : "My activity",
        subtitle: showReview ? "Review & moderate submissions" : "",
        onNotifications: showNotifications,
      }
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
          onOpenAdmin={() => setOverlay("admin")}
          onSave={handleSaveProfile}
          onLogout={onLogout}
        />
        <StatusBar style="dark" />
      </>
    );
  }

  if (overlay === "events") {
    return withNav(
      <>
        <EventsScreen
          events={events}
          eventTypes={eventTypes}
          cities={cities}
          onOpenEvent={(event) => openDetail("event", event.id)}
        />
        <StatusBar style="dark" />
      </>,
      { title: "Events", onNotifications: showNotifications }
    );
  }

  return withNav(
    <>
      <FeedScreen
        events={events}
        userId={user.id}
        cities={cities}
        onOpenEvent={(event) => openDetail(event.kind ?? "event", event.id)}
      />
      <StatusBar style="dark" />
    </>,
    {
      logo: require("../../assets/akanksha-mark.png"),
      onNotifications: showNotifications,
    }
  );
}

function getStyles(isDark: boolean) {
  const colors = isDark ? darkPalette : palette;
  return StyleSheet.create({
    shell: { flex: 1, backgroundColor: isDark ? "#0d1322" : "#f4f6fa" },
    shellBody: { flex: 1 },
    safe: { flex: 1, backgroundColor: isDark ? "#0d1322" : "#f4f6fa" },
    chooser: { gap: 8, paddingBottom: 8 },
    activitySwitch: { paddingHorizontal: 16, paddingTop: 12 },
    chooserEmpty: { textAlign: "center", color: colors.inkSoft, paddingVertical: 24 },
  });
}
