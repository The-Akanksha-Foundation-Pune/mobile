import { useEffect, useMemo, useState } from "react";
import { Alert, Platform } from "react-native";
import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import * as ImagePicker from "expo-image-picker";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";
import {
  GOOGLE_ANDROID_CLIENT_ID,
  GOOGLE_EXPO_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_WEB_CLIENT_ID,
} from "./config/constants";
import { useAppRoute } from "./hooks/useAppRoute";
import { HomeScreen } from "./screens/HomeScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { NotFoundScreen } from "./screens/NotFoundScreen";
import { fetchEventBootstrap, signInWithGoogle, uploadEvent } from "./services/api";
import type { EventItem, EventType, MediaMode, SelectedMedia, User } from "./types/app";

WebBrowser.maybeCompleteAuthSession();

export default function App() {
  const isExpoGo = Constants.appOwnership === "expo";
  const redirectUri = useMemo(() => {
    if (Platform.OS === "web") {
      // Web should return to the current origin callback, not Expo hosted auth proxy.
      return AuthSession.makeRedirectUri();
    }

    if (isExpoGo) {
      const owner = Constants.expoConfig?.owner;
      const slug = Constants.expoConfig?.slug;
      if (owner && slug) {
        return `https://auth.expo.io/@${owner}/${slug}`;
      }
      return AuthSession.makeRedirectUri();
    }

    return AuthSession.makeRedirectUri({ scheme: "captureakanksha" });
  }, [isExpoGo]);
  const [token, setToken] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const { route, setRoute } = useAppRoute();

  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [caption, setCaption] = useState("");
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10));
  const [mediaType, setMediaType] = useState<MediaMode>("photo");
  const [media, setMedia] = useState<SelectedMedia>(null);
  const [isLoading, setIsLoading] = useState(false);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_EXPO_CLIENT_ID,
    webClientId: GOOGLE_WEB_CLIENT_ID,
    androidClientId: isExpoGo ? undefined : GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: isExpoGo ? undefined : GOOGLE_IOS_CLIENT_ID,
    redirectUri,
  });

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
  }, [response]);

  useEffect(() => {
    if (!token) {
      return;
    }
    void loadTypesAndEvents();
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
    if (!selectedTypeId || !caption.trim() || !eventDate || !media) {
      Alert.alert("Missing fields", "Type, date, caption and media are required.");
      return;
    }

    try {
      setIsLoading(true);
      await uploadEvent({
        token,
        caption,
        typeId: selectedTypeId,
        eventDate,
        mediaType,
        media,
      });
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
    setCaption("");
    setMedia(null);
    setRoute("home");
  }

  if (route === "notFound") {
    return <NotFoundScreen onGoHome={() => setRoute("home")} onGoLogin={handleLogout} />;
  }

  if (!token || !user) {
    return (
      <LoginScreen
        isLoading={isLoading}
        canStartLogin={Boolean(request)}
        onLoginPress={() => promptAsync()}
      />
    );
  }

  return (
    <HomeScreen
      user={user}
      eventTypes={eventTypes}
      groupedEvents={groupedEvents}
      selectedTypeId={selectedTypeId}
      caption={caption}
      eventDate={eventDate}
      mediaType={mediaType}
      media={media}
      isLoading={isLoading}
      onLogout={handleLogout}
      onSelectMediaType={setMediaType}
      onSelectType={setSelectedTypeId}
      onChangeEventDate={setEventDate}
      onChangeCaption={setCaption}
      onCaptureMedia={handleCaptureFromCamera}
      onSaveEvent={handleSubmitEvent}
    />
  );
}
