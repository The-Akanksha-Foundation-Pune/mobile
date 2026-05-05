import { useEffect, useMemo, useState } from "react";
import { Alert, Platform } from "react-native";
import { makeRedirectUri } from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as ImagePicker from "expo-image-picker";
import * as WebBrowser from "expo-web-browser";
import {
  GOOGLE_ANDROID_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_WEB_CLIENT_ID,
} from "./config/constants";
import { useAppRoute } from "./hooks/useAppRoute";
import { HomeScreen } from "./screens/HomeScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { NotFoundScreen } from "./screens/NotFoundScreen";
import { fetchCurrentUser, fetchEventBootstrap, signInWithGoogle, uploadEvent } from "./services/api";
import type { EventItem, EventType, MediaMode, SelectedMedia, User } from "./types/app";

WebBrowser.maybeCompleteAuthSession();

const WEB_AUTH_TOKEN_KEY = "captureakanksha.authToken";
const PLATFORM_CLIENT_ID = Platform.select({
  android: GOOGLE_ANDROID_CLIENT_ID,
  ios: GOOGLE_IOS_CLIENT_ID,
  default: GOOGLE_WEB_CLIENT_ID,
});
const NATIVE_REDIRECT_URI = makeRedirectUri({
  scheme: "captureakanksha",
  path: "oauthredirect",
});

export default function App() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [isAuthBootstrapped, setIsAuthBootstrapped] = useState(Platform.OS !== "web");
  const { route, setRoute } = useAppRoute();

  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10));
  const [mediaType, setMediaType] = useState<MediaMode>("photo");
  const [media, setMedia] = useState<SelectedMedia>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    // Keep client IDs platform-specific so Android does not fall back to web client redirect behavior.
    clientId: PLATFORM_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
    androidClientId: GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    redirectUri: Platform.OS === "web" ? undefined : NATIVE_REDIRECT_URI,
  });

  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }

    try {
      const savedToken = window.localStorage.getItem(WEB_AUTH_TOKEN_KEY) || "";
      if (savedToken) {
        setToken(savedToken);
      }
    } catch (_error) {
      // Ignore storage access issues and continue without a persisted session.
    } finally {
      setIsAuthBootstrapped(true);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }

    try {
      if (token) {
        window.localStorage.setItem(WEB_AUTH_TOKEN_KEY, token);
      } else {
        window.localStorage.removeItem(WEB_AUTH_TOKEN_KEY);
      }
    } catch (_error) {
      // Ignore storage write issues.
    }
  }, [token]);

  useEffect(() => {
    if (response?.type === "success") {
      const idToken = response.params.id_token;
      if (idToken) {
        void handleGoogleLogin(idToken);
      }
    }
    if (response?.type === "error") {
      const errorDescription =
        response.error?.description || response.error?.message || "Google auth request failed.";
      Alert.alert("Google sign-in error", errorDescription);
    }
    if (response?.type === "dismiss" || response?.type === "cancel") {
      Alert.alert("Google sign-in cancelled", "Please try again to continue.");
    }
  }, [response]);

  useEffect(() => {
    if (!token) {
      return;
    }
    void hydrateAuthenticatedSession();
  }, [token]);

  const groupedEvents = useMemo(() => {
    const grouped: Record<string, Record<string, EventItem[]>> = {};
    for (const event of events) {
      const typeLabel = event.eventTypeName || "Unknown";
      if (!grouped[typeLabel]) {
        grouped[typeLabel] = {};
      }
      if (!grouped[typeLabel][event.eventDate]) {
        grouped[typeLabel][event.eventDate] = [];
      }
      grouped[typeLabel][event.eventDate].push(event);
    }
    return grouped;
  }, [events]);

  async function handleGoogleLogin(idToken: string) {
    try {
      setIsLoading(true);
      const auth = await signInWithGoogle(idToken);
      setToken(auth.token);
      setUser(auth.user);
    } catch (error) {
      Alert.alert("Login error", (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadTypesAndEvents() {
    try {
      const bootstrap = await fetchEventBootstrap(token);
      setEventTypes(bootstrap.eventTypes);
      setEvents(bootstrap.events);

      if (!selectedTypeId && bootstrap.eventTypes.length > 0) {
        setSelectedTypeId(bootstrap.eventTypes[0].id);
      }
    } catch (error) {
      Alert.alert("Data error", (error as Error).message);
    }
  }

  async function hydrateAuthenticatedSession() {
    try {
      const me = await fetchCurrentUser(token);
      setUser(me);
      await loadTypesAndEvents();
    } catch (error) {
      handleLogout();
      Alert.alert("Session expired", "Please sign in again.");
    }
  }

  async function handleCaptureFromCamera() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission needed", "Camera permission is required.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: mediaType === "photo" ? ["images"] : ["videos"],
      quality: 0.7,
      videoMaxDuration: 60,
    });

    if (!result.canceled && result.assets[0]) {
      setMedia(result.assets[0]);
    }
  }

  async function handleSubmitEvent() {
    if (!selectedTypeId || !eventTitle.trim() || !caption.trim() || !eventDate || !media) {
      Alert.alert("Missing fields", "Title, type, date, caption and media are required.");
      return;
    }

    try {
      setIsLoading(true);
      await uploadEvent({
        token,
        title: eventTitle,
        caption,
        typeId: selectedTypeId,
        eventDate,
        mediaType,
        media,
      });
      setEventTitle("");
      setCaption("");
      setMedia(null);
      await loadTypesAndEvents();
      Alert.alert("Success", "Event uploaded successfully.");
    } catch (error) {
      Alert.alert("Upload error", (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleLogout() {
    setToken("");
    setUser(null);
    setEvents([]);
    setEventTypes([]);
    setSelectedTypeId("");
    setEventTitle("");
    setCaption("");
    setEventDate(new Date().toISOString().slice(0, 10));
    setMediaType("photo");
    setMedia(null);
    setIsLoading(false);
    setRoute("home");
  }

  if (route === "notFound") {
    return <NotFoundScreen onGoHome={() => setRoute("home")} onGoLogin={handleLogout} />;
  }

  if (!isAuthBootstrapped) {
    return null;
  }

  if (!token || !user) {
    return (
      <LoginScreen
        isLoading={isLoading}
        canStartLogin
        onLoginPress={() => {
          if (!request) {
            Alert.alert("Login not ready", "Google sign-in is still initializing. Please try again.");
            return;
          }
          void promptAsync().catch((error) => {
            Alert.alert("Google sign-in error", (error as Error).message);
          });
        }}
      />
    );
  }

  return (
    <HomeScreen
      token={token}
      user={user}
      eventTypes={eventTypes}
      groupedEvents={groupedEvents}
      selectedTypeId={selectedTypeId}
      eventTitle={eventTitle}
      caption={caption}
      eventDate={eventDate}
      mediaType={mediaType}
      media={media}
      isLoading={isLoading}
      onLogout={handleLogout}
      onSelectMediaType={setMediaType}
      onSelectType={setSelectedTypeId}
      onChangeEventDate={setEventDate}
      onChangeEventTitle={setEventTitle}
      onChangeCaption={setCaption}
      onCaptureMedia={handleCaptureFromCamera}
      onSaveEvent={handleSubmitEvent}
    />
  );
}
