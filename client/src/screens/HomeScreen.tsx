import { ComponentProps, useEffect, useMemo, useState } from "react";
import { BackHandler, Platform, StyleSheet, Text, View, useColorScheme } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { CaptureHeader, CaptureLayout, ContentFrame } from "../components";
import { BottomSheet, ListLoader, OfflineState, OptionRow, PillTabs, popupAlert } from "../components/capture";
import { useConnectionStatus } from "../hooks/useConnection";
import { formatEventDate } from "../utils/eventPresenters";
import type { CaptureTab } from "../components";
import type {
  City,
  CostCenter,
  EventItem,
  ContentKind,
  MediaMode,
  SelectedMedia,
  User,
} from "../types/app";
import { darkPalette, palette } from "../theme/theme";
import { captureLight } from "../theme/capture";
import { AddEventScreen } from "./AddEventScreen";
import { ActivityScreen } from "./ActivityScreen";
import { ProfileScreen } from "./ProfileScreen";
import { ReviewQueueScreen } from "./ReviewQueueScreen";
import { AccessScreen } from "./AccessScreen";
import { CalendarEventsScreen } from "./CalendarEventsScreen";
import { useCalendarConnection } from "../hooks/useCalendarConnection";
import { can } from "../utils/permissions";
import { EventHubScreen } from "./EventHubScreen";
import { PostDetailScreen } from "./PostDetailScreen";
import { StoryDetailScreen } from "./StoryDetailScreen";
import { AdminScreen } from "./AdminScreen";
import { FeedScreen } from "./FeedScreen";
import { EventsScreen } from "./EventsScreen";
import { NotificationsScreen } from "./NotificationsScreen";
import { useNotifications, type AppNotification } from "../hooks/useNotifications";

type HomeScreenProps = {
  token: string;
  user: User;
  cities: City[];
  costCenters: CostCenter[];
  events: EventItem[];
  eventTitle: string;
  caption: string;
  eventDate: string;
  eventLocation: string;
  mediaType: MediaMode;
  media: SelectedMedia;
  isLoading: boolean;
  onLogout: () => void;
  onSelectMediaType: (next: MediaMode) => void;
  onChangeEventDate: (next: string) => void;
  onChangeEventTitle: (next: string) => void;
  onChangeCaption: (next: string) => void;
  onChangeEventLocation: (next: string) => void;
  onCaptureMedia: () => Promise<boolean>;
  onPickMedia: () => Promise<boolean>;
  /** True while events, cities and cost centers are being fetched. */
  sessionLoading?: boolean;
  /** Reloads events, cities and cost centres (used after the connection comes back). */
  onReload?: () => Promise<void> | void;
  onSaveEvent: (
    costCenterId: string | null,
    cityId?: string | null,
    options?: { kind?: ContentKind; parentEventId?: string; body?: string }
  ) => Promise<boolean>;
  body: string;
  onChangeBody: (next: string) => void;
  eventEndDate: string;
  onChangeEventEndDate: (next: string) => void;
  /** Clears the capture form fields and media when the form is left without saving. */
  onDiscardDraft: () => void;
};

type DetailRef = { kind: ContentKind; id: string };
type AddTarget = { kind: ContentKind; parentEvent: EventItem | null };

type OverlayScreen = "add" | "admin" | "profile" | "activity" | "events" | "notifications" | "access" | "calendar" | null;

export function HomeScreen(props: HomeScreenProps) {
  const {
    token,
    user,
    cities,
    costCenters,
    events,
    eventTitle,
    caption,
    eventDate,
    eventLocation,
    mediaType,
    media,
    isLoading,
    onLogout,
    onSelectMediaType,
    onChangeEventDate,
    onChangeEventTitle,
    onChangeCaption,
    onChangeEventLocation,
    onCaptureMedia,
    onPickMedia,
    sessionLoading = false,
    onReload,
    onSaveEvent,
    body,
    onChangeBody,
    eventEndDate,
    onChangeEventEndDate,
    onDiscardDraft,
  } = props;

  const [filterCityId, setFilterCityId] = useState<string | null>(user.cityId ?? null);
  const [detailStack, setDetailStack] = useState<DetailRef[]>([]);
  const [addTarget, setAddTarget] = useState<AddTarget>({ kind: "event", parentEvent: null });
  const [chooserOpen, setChooserOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const connection = useConnectionStatus();
  const noData = !sessionLoading && events.length === 0;
  const showOffline = noData && (connection.status === "offline" || connection.status === "slow");
  // When the connection comes back and nothing was loaded, load it without asking.
  useEffect(() => {
    if (connection.status === "online" && noData) void onReload?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection.status]);
  const [menuOpen, setMenuOpen] = useState(false);
  const detail = detailStack[detailStack.length - 1] ?? null;
  const [overlay, setOverlay] = useState<OverlayScreen>(null);
  const [activityView, setActivityView] = useState<"mine" | "review">("mine");
  const [reviewEventId, setReviewEventId] = useState<string | null>(null);
  /** Where the back arrow on the notifications page returns to. */
  const [notificationsReturn, setNotificationsReturn] = useState<OverlayScreen>(null);
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(events, user);
  const isDark = useColorScheme() === "dark";
  const styles = useMemo(() => getStyles(isDark), [isDark]);
  const colors = isDark ? darkPalette : palette;
  const canApprove = can(user, "approve_post");
  const canCreateEvent = can(user, "create_event");
  const canManageAccess = can(user, "manage_access");
  const isAdmin = can(user, "manage_settings");
  /** Google Calendar link: Special Access and Super Admin (anyone who may import events). */
  const isSpecialAccess = can(user, "import_events");
  const calendar = useCalendarConnection(token, isSpecialAccess, user.email);

  // A full-page OAuth redirect (popup blocked on web) lands back on the app with Google's result in
  // the URL; the hook reports it once it has been processed, which may be after the first render.
  useEffect(() => {
    const result = calendar.consumePendingResult();
    if (!result) return;
    setOverlay("profile");
    if (result.ok) popupAlert("Calendar connected", "Your Google Calendar is linked. You can now preview its events.");
    else popupAlert("Could not connect calendar", result.reason);
  }, [calendar.consumePendingResult]);

  async function handleConnectCalendar() {
    const result = await calendar.connect();
    if (result.ok) {
      popupAlert("Calendar connected", "Your Google Calendar is linked. You can now preview its events.");
    } else if (result.reason !== "Redirecting to Google...") {
      popupAlert("Could not connect calendar", result.reason);
    }
  }

  function handleDisconnectCalendar() {
    popupAlert("Disconnect Google Calendar?", "The app will forget the link. You can connect it again any time.", [
      { text: "Keep", style: "cancel" },
      {
        text: "Disconnect",
        style: "destructive",
        onPress: () => {
          void calendar.disconnect().catch((error: Error) => popupAlert("Could not disconnect", error.message));
        },
      },
    ]);
  }

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

  function openDetail(kind: ContentKind, id: string) {
    setDetailStack((stack) => [...stack, { kind, id }]);
  }

  function closeDetail() {
    setDetailStack((stack) => stack.slice(0, -1));
  }

  function startAdd(kind: ContentKind, parentEvent: EventItem | null = null) {
    setChooserOpen(false);
    setAddTarget({ kind, parentEvent });
    setOverlay("add");
  }

  /** Posts and stories start with the camera; the details form opens once a photo is taken. */
  /** Step 1: user picked Post or Story. Ask where the photo comes from. */
  function startCapture(kind: Exclude<ContentKind, "event">, parentEvent: EventItem | null = null) {
    setChooserOpen(false);
    setAddTarget({ kind, parentEvent });
    setSourceOpen(true);
  }

  /** Step 2: open the camera or the gallery, then the capture form once media is chosen. */
  async function startWithSource(source: "camera" | "gallery") {
    setSourceOpen(false);
    // The sheet is a Modal that takes ~200ms to dismiss. On Android the camera and
    // gallery silently refuse to open while a Modal is still showing, so wait for it.
    await new Promise((resolve) => setTimeout(resolve, 300));
    const captured = source === "camera" ? await onCaptureMedia() : await onPickMedia();
    if (captured) setOverlay("add");
  }

  /** Leaving the capture form without saving drops the draft, so the next form starts empty. */
  function closeAdd() {
    onDiscardDraft();
    setOverlay(null);
  }

  function goHome() {
    setDetailStack([]);
    setOverlay(null);
  }

  /**
   * Android back button: unwind one level of our own navigation, innermost first.
   * Sheets and popups are Modals and already close themselves on back.
   * Returning false on the Feed tab lets Android leave the app as usual.
   */
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (overlay === "add") {
        closeAdd();
        return true;
      }
      if (detailStack.length > 0) {
        closeDetail();
        return true;
      }
      if (overlay === "notifications") {
        setOverlay(notificationsReturn);
        return true;
      }
      if (overlay === "activity" && activityView === "review") {
        if (reviewEventId) setReviewEventId(null);
        else setActivityView("mine");
        return true;
      }
      if (overlay === "access" || overlay === "calendar") {
        setOverlay("profile");
        return true;
      }
      if (overlay !== null) {
        setOverlay(null);
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [overlay, detailStack.length, notificationsReturn, activityView, reviewEventId]);

  function handleNavSelect(id: string) {
    if (id === "home") {
      goHome();
    } else if (id === "events") {
      setDetailStack([]);
      setOverlay("events");
    } else if (id === "add") {
      if (!addCity) {
        popupAlert("No city available", "Cities have not loaded yet. Try again in a moment.");
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
    const current = overlay === "notifications" ? notificationsReturn : overlay;
    if (current === "profile") return "account";
    if (current === "activity") return "activity";
    if (current === "events") return "events";
    return "home";
  }

  function showNotifications() {
    if (overlay === "notifications") return;
    setNotificationsReturn(overlay);
    setDetailStack([]);
    setOverlay("notifications");
  }

  function openNotification(notification: AppNotification) {
    markRead(notification.id);
    if (notification.target.type === "reviewQueue") {
      setActivityView("review");
      setOverlay("activity");
      return;
    }
    // Detail pages sit on top of the notifications page, so back returns here.
    openDetail(notification.target.kind, notification.target.id);
  }

  // Only events that have started accept posts and stories.
  const eventChoices = events
    .filter((event) => (event.kind ?? "event") === "event" && event.eventStatus === "ongoing")
    .sort((a, b) => b.eventDate.localeCompare(a.eventDate));

  /** Sheets behind the "+" button: what to capture, and which event to attach to. */
  const captureSheets = (
    <>
      <BottomSheet visible={chooserOpen} onClose={() => setChooserOpen(false)} title="Capture a milestone">
        <View style={styles.chooser}>
          <OptionRow icon="camera-outline" label="Post" description="Take a photo or video for an event" onPress={() => startCapture("post")} />
          <OptionRow icon="book-open-page-variant" label="Story" description="A photo with a longer student story" onPress={() => startCapture("story")} />
          {canCreateEvent ? (
            <OptionRow icon="calendar-plus" label="New event" description="Create an event others can post to" onPress={() => startAdd("event")} />
          ) : null}
        </View>
      </BottomSheet>
      <BottomSheet
        visible={sourceOpen}
        onClose={() => setSourceOpen(false)}
        title={addTarget.kind === "story" ? "Photo for the story" : "Photo or video for the post"}
      >
        <View style={styles.chooser}>
          <OptionRow icon="camera-outline" label="Take a photo" description="Open the camera now" onPress={() => void startWithSource("camera")} />
          <OptionRow icon="image-multiple-outline" label="Choose from gallery" description="Pick something already on your phone" onPress={() => void startWithSource("gallery")} />
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
              description="Manage content, cities, cost centers and limits"
              onPress={() => {
                setMenuOpen(false);
                setOverlay("admin");
              }}
            />
          ) : null}
          {canManageAccess ? (
            <OptionRow
              icon="account-key-outline"
              label="Access management"
              description="Give or remove access"
              onPress={() => {
                setMenuOpen(false);
                setOverlay("access");
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

  /** Full-screen pages without the bottom bar, kept to the centered column on tablets. */
  function fullScreen(content: React.ReactNode) {
    return (
      <View style={{ flex: 1, backgroundColor: captureLight.surface }}>
        <ContentFrame fill>{content}</ContentFrame>
      </View>
    );
  }

  /** Wraps a screen in the shared layout: header on top, bottom bar underneath. */
  function withNav(content: React.ReactNode, header: ComponentProps<typeof CaptureHeader> | null = null) {
    return (
      <CaptureLayout
        header={header ? { ...header, notificationCount: unreadCount, onMore: () => setMenuOpen(true) } : null}
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
    return fullScreen(
      <AddEventScreen
        token={token}
        city={addCityForTarget}
        costCenter={addTarget.parentEvent ? null : addCostCenter}
        mode={addTarget.kind}
        parentEvent={addTarget.parentEvent}
        body={body}
        onChangeBody={onChangeBody}
        endDate={eventEndDate}
        onChangeEndDate={onChangeEventEndDate}
        eventTitle={eventTitle}
        caption={caption}
        eventDate={eventDate}
        mediaType={mediaType}
        media={media}
        isLoading={isLoading}
        onClose={closeAdd}
        onSelectMediaType={onSelectMediaType}
        onChangeEventDate={onChangeEventDate}
        onChangeEventTitle={onChangeEventTitle}
        onChangeCaption={onChangeCaption}
        onChangeLocation={onChangeEventLocation}
        onCaptureMedia={onCaptureMedia}
        onPickMedia={onPickMedia}
        events={eventChoices}
        onSaveEvent={async (parent) => {
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
    return fullScreen(<AdminScreen token={token} onClose={() => setOverlay(null)} />);
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
            onContribute={(kind, parent) => startCapture(kind, parent)}
          />
          <StatusBar style="dark" />
        </>,
        { ...headerBase, title: "Event" }
      );
    }
    if (detail.kind === "story") {
      return withNav(
        <>
          <StoryDetailScreen story={record} onOpenParent={(id) => openDetail("event", id)} showReviewStatus={canApprove} />
          <StatusBar style="dark" />
        </>,
        { ...headerBase, title: "Story" }
      );
    }
    return withNav(
      <>
        <PostDetailScreen post={record} onOpenParent={(id) => openDetail("event", id)} showReviewStatus={canApprove} />
        <StatusBar style="dark" />
      </>,
      { ...headerBase, title: "Post" }
    );
  }

  if (overlay === "notifications") {
    return withNav(
      <>
        <NotificationsScreen
          notifications={notifications}
          unreadCount={unreadCount}
          onOpen={openNotification}
          onMarkAllRead={markAllRead}
        />
        <StatusBar style="dark" />
      </>,
      { title: "Notifications", onBack: () => setOverlay(notificationsReturn), right: null }
    );
  }

  if (overlay === "activity") {
    const showReview = canApprove && activityView === "review";
    return withNav(
      <>
        {canApprove ? (
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
          <ReviewQueueScreen token={token} cities={cities} eventId={reviewEventId} onSelectEvent={setReviewEventId} />
        ) : (
          (sessionLoading && events.length === 0) ? (
            <ListLoader message="Loading your activity..." />
          ) : (
            <ActivityScreen
              events={events}
              userId={user.id}
              onOpenEvent={(event) => openDetail(event.kind ?? "event", event.id)}
              onCreate={() => handleNavSelect("add")}
            />
          )
        )}
        <StatusBar style="dark" />
      </>,
      {
        title: showReview
          ? (reviewEventId && events.find((event) => event.id === reviewEventId)?.title) || "Review queue"
          : "My activity",
        subtitle: showReview ? (reviewEventId ? "Review posts and stories" : "Choose an event to review") : "",
        onBack: showReview
          ? () => {
              if (reviewEventId) setReviewEventId(null);
              else setActivityView("mine");
            }
          : undefined,
        onNotifications: showNotifications,
      }
    );
  }

  if (overlay === "access" && canManageAccess) {
    return withNav(
      <>
        <AccessScreen token={token} currentUser={user} />
        <StatusBar style="dark" />
      </>,
      { title: "Access management", subtitle: "Give or remove access", onBack: () => setOverlay("profile"), onNotifications: showNotifications }
    );
  }

  if (overlay === "calendar" && isSpecialAccess) {
    return withNav(
      <>
        <CalendarEventsScreen
          token={token}
          cities={cities}
          costCenters={costCenters}
          defaultCostCenterId={user.costCenterId ?? null}
          onReconnect={() => {
            setOverlay("profile");
            void calendar.refresh();
          }}
          onImported={() => void onReload?.()}
        />
        <StatusBar style="dark" />
      </>,
      {
        title: "Calendar events",
        subtitle: calendar.connection?.connected ? calendar.connection.email : "Google Calendar",
        onBack: () => setOverlay("profile"),
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
          isAdmin={isAdmin}
          onOpenAdmin={() => setOverlay("admin")}
          canManageAccess={canManageAccess}
          onOpenAccess={() => setOverlay("access")}
          onLogout={onLogout}
          calendar={
            isSpecialAccess
              ? {
                  connection: calendar.connection,
                  connecting: calendar.connecting,
                  onConnect: () => void handleConnectCalendar(),
                  onDisconnect: handleDisconnectCalendar,
                  onOpenEvents: () => setOverlay("calendar"),
                }
              : undefined
          }
        />
        <StatusBar style="dark" />
      </>,
      { title: "Profile", subtitle: "", onNotifications: showNotifications }
    );
  }

  if (overlay === "events") {
    return withNav(
      <>
        {showOffline ? (
          <OfflineState variant={connection.status === "slow" ? "slow" : "offline"} onRetry={onReload} />
        ) : (sessionLoading && events.length === 0) ? (
          <ListLoader message="Loading events..." />
        ) : (
          <EventsScreen
            events={events}
            cities={cities}
            onOpenEvent={(event) => openDetail("event", event.id)}
          />
        )}
        <StatusBar style="dark" />
      </>,
      { title: "Events", onNotifications: showNotifications }
    );
  }

  return withNav(
    <>
      {showOffline ? (
        <OfflineState variant={connection.status === "slow" ? "slow" : "offline"} onRetry={onReload} />
      ) : (sessionLoading && events.length === 0) ? (
        <ListLoader message="Loading the feed..." />
      ) : (
        <FeedScreen
          events={events}
          userId={user.id}
          cities={cities}
          onOpenEvent={(event) => openDetail(event.kind ?? "event", event.id)}
        />
      )}
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
