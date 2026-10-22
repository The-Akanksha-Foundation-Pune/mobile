import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, AppState, Image, Platform, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { makeRedirectUri } from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import { GoogleSignin, isErrorWithCode, statusCodes } from "@react-native-google-signin/google-signin";
import * as ImagePicker from "expo-image-picker";
import * as WebBrowser from "expo-web-browser";
import {
  GOOGLE_ANDROID_CLIENT_ID,
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_WEB_CLIENT_ID,
} from "./config/constants";
import { configureGoogleSignin } from "./services/googleSignin";
import { useAppRoute } from "./hooks/useAppRoute";
import { HomeScreen } from "./screens/HomeScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { NotFoundScreen } from "./screens/NotFoundScreen";
import { Appearance } from "react-native";
import { useFonts } from "expo-font";
import { CardPreview } from "./dev/CardPreview";
import { CalendarEventsPreview, ProfilePreview } from "./dev/ProfilePreview";
import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from "@expo-google-fonts/inter";
import {
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { ListLoader, popupAlert } from "./components/capture";
import { citiesWithCostCenters } from "./config/cities";
import {
  fetchCities,
  fetchCostCenters,
  fetchCurrentUser,
  fetchEventBootstrap,
  signInWithGoogle,
  uploadEvent,
} from "./services/api";
import { getDummyCostCenters, USE_DUMMY_HUB_DATA } from "./data/dummyHubData";
import type { City, ContentKind, CostCenter, EventItem, MediaMode, SelectedMedia, User } from "./types/app";

WebBrowser.maybeCompleteAuthSession();

const WEB_AUTH_TOKEN_KEY = "captureakanksha.authToken";
const PLATFORM_CLIENT_ID = Platform.select({
  android: GOOGLE_ANDROID_CLIENT_ID,
  ios: GOOGLE_IOS_CLIENT_ID,
  default: GOOGLE_WEB_CLIENT_ID,
});
const GOOGLE_ANDROID_REDIRECT_SCHEME = `com.googleusercontent.apps.${GOOGLE_ANDROID_CLIENT_ID.replace(
  ".apps.googleusercontent.com",
  ""
)}`;
const GOOGLE_IOS_REDIRECT_SCHEME = `com.googleusercontent.apps.${GOOGLE_IOS_CLIENT_ID.replace(
  ".apps.googleusercontent.com",
  ""
)}`;
const NATIVE_REDIRECT_URI = makeRedirectUri({
  native: Platform.select({
    android: `${GOOGLE_ANDROID_REDIRECT_SCHEME}:/oauthredirect`,
    ios: `${GOOGLE_IOS_REDIRECT_SCHEME}:/oauthredirect`,
    default: undefined,
  }),
});
function getWebOAuthRedirectUri(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return process.env.EXPO_PUBLIC_WEB_REDIRECT_URI || makeRedirectUri({ preferLocalhost: false });
}

function parseWebOAuthIdToken(): string | null {
  if (typeof window === "undefined" || !window.location.hash) return null;
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  return new URLSearchParams(hash).get("id_token");
}

function clearWebOAuthHash(): void {
  if (typeof window === "undefined" || !window.location.hash) return;
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
}

export default function App() {
  useEffect(() => {
    // The app is light-only; pin the scheme so older screens never pick up the phone's dark mode.
    if (typeof Appearance.setColorScheme === "function") {
      Appearance.setColorScheme("light");
    }
  }, []);
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const [token, setToken] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [isAuthBootstrapped, setIsAuthBootstrapped] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const { route, setRoute } = useAppRoute();

  const [cities, setCities] = useState<City[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventTitle, setEventTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10));
  const [eventLocation, setEventLocation] = useState("");
  const [body, setBody] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [mediaType, setMediaType] = useState<MediaMode>("photo");
  const [media, setMedia] = useState<SelectedMedia>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const oauthExchangeStartedRef = useRef(false);

  const webRedirectUri = useMemo(
    () => (Platform.OS === "web" ? getWebOAuthRedirectUri() : ""),
    []
  );

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(
    {
      clientId: Platform.OS === "web" ? GOOGLE_WEB_CLIENT_ID : PLATFORM_CLIENT_ID,
      webClientId: GOOGLE_WEB_CLIENT_ID,
      androidClientId: GOOGLE_ANDROID_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID,
      redirectUri: Platform.OS === "web" ? webRedirectUri : NATIVE_REDIRECT_URI,
      selectAccount: true,
    },
    Platform.OS === "web" ? { preferLocalhost: false } : undefined
  );

  useEffect(() => {
    if (Platform.OS === "web") return;
    configureGoogleSignin();
  }, []);

  useEffect(() => {
    async function bootstrapAuthToken() {
      try {
        if (Platform.OS === "web") {
          const savedToken = window.localStorage.getItem(WEB_AUTH_TOKEN_KEY) || "";
          if (savedToken) setToken(savedToken);
        } else {
          const savedToken = (await AsyncStorage.getItem(WEB_AUTH_TOKEN_KEY)) || "";
          if (savedToken) setToken(savedToken);
        }
      } catch (_error) {
        // Ignore storage access issues.
      } finally {
        setIsAuthBootstrapped(true);
      }
    }
    void bootstrapAuthToken();
  }, []);

  useEffect(() => {
    async function persistToken() {
      try {
        if (Platform.OS === "web") {
          if (token) window.localStorage.setItem(WEB_AUTH_TOKEN_KEY, token);
          else window.localStorage.removeItem(WEB_AUTH_TOKEN_KEY);
          return;
        }
        if (token) {
          await AsyncStorage.setItem(WEB_AUTH_TOKEN_KEY, token);
        } else {
          await AsyncStorage.removeItem(WEB_AUTH_TOKEN_KEY);
        }
      } catch (_error) {
        // Ignore storage write issues.
      }
    }
    if (!isAuthBootstrapped) return;
    void persistToken();
  }, [token, isAuthBootstrapped]);

  useEffect(() => {
    if (response?.type === "success") {
      if (oauthExchangeStartedRef.current) return;
      const idToken = response.params.id_token;
      if (!idToken) {
        const hint =
          Platform.OS === "web" && webRedirectUri
            ? ` Add redirect URI in Google Console: ${webRedirectUri}`
            : "";
        setLoginError(`Google did not return an ID token.${hint}`);
        if (Platform.OS === "web") clearWebOAuthHash();
        return;
      }
      oauthExchangeStartedRef.current = true;
      if (Platform.OS === "web") clearWebOAuthHash();
      setLoginError("");
      void handleGoogleLogin(idToken);
    }
    if (response?.type === "error") {
      if (Platform.OS === "web") clearWebOAuthHash();
      const errorDescription =
        response.error?.description || response.error?.message || "Google auth request failed.";
      setLoginError(errorDescription);
      if (Platform.OS !== "web") {
        popupAlert("Google sign-in error", errorDescription);
      }
    }
    if (response?.type === "dismiss" || response?.type === "cancel") {
      if (Platform.OS === "web") clearWebOAuthHash();
      setLoginError("Google sign-in cancelled. Please try again.");
      if (Platform.OS !== "web") {
        popupAlert("Google sign-in cancelled", "Please try again to continue.");
      }
    }
  }, [response, webRedirectUri]);

  // Full-page OAuth redirect (_self) can return before expo-auth-session reads the hash.
  useEffect(() => {
    if (Platform.OS !== "web" || !isAuthBootstrapped || oauthExchangeStartedRef.current) return;
    const idToken = parseWebOAuthIdToken();
    if (!idToken) return;
    oauthExchangeStartedRef.current = true;
    clearWebOAuthHash();
    setLoginError("");
    void handleGoogleLogin(idToken);
  }, [isAuthBootstrapped]);

  useEffect(() => {
    if (!token) return;
    void hydrateAuthenticatedSession();
  }, [token]);

  // Phones keep the app alive in the background for hours, so re-read the profile whenever
  // it comes back to the foreground: AFDW may have changed the person's cost centre or city.
  useEffect(() => {
    if (!token) return;
    const sub = AppState.addEventListener("change", (next) => {
      if (next !== "active") return;
      fetchCurrentUser(token)
        .then(setUser)
        .catch(() => {
          // Offline or a brief server error: keep the profile already on screen.
        });
    });
    return () => sub.remove();
  }, [token]);

  async function handleGoogleLogin(idToken: string) {
    try {
      setIsLoading(true);
      setLoginError("");
      const auth = await signInWithGoogle(idToken);
      setToken(auth.token);
      setUser(auth.user);
    } catch (error) {
      const message = (error as Error).message;
      setLoginError(message);
      if (Platform.OS !== "web") {
        popupAlert("Login error", message);
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleNativeGoogleSignIn() {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      // Ensure Android shows the account chooser (emails on device)
      // instead of silently reusing a previously selected account.
      const hasSession = GoogleSignin.hasPreviousSignIn();
      if (hasSession) {
        await GoogleSignin.signOut();
      }
      const signInResult = await GoogleSignin.signIn();
      if (signInResult.type !== "success") {
        popupAlert("Google sign-in cancelled", "Please try again to continue.");
        return;
      }
      let idToken = signInResult.data.idToken;
      // Some Android builds can return a null idToken from signIn(),
      // but getTokens() still returns it for the active account.
      if (!idToken) {
        const tokens = await GoogleSignin.getTokens();
        idToken = tokens.idToken;
      }
      if (!idToken) {
        throw new Error("Google did not return an ID token. Check OAuth client setup.");
      }
      await handleGoogleLogin(idToken);
    } catch (error) {
      if (isErrorWithCode(error)) {
        if (error.code === statusCodes.SIGN_IN_CANCELLED) {
          popupAlert("Google sign-in cancelled", "Please try again to continue.");
          return;
        }
        if (error.code === statusCodes.IN_PROGRESS) {
          popupAlert("Google sign-in", "A sign-in request is already in progress.");
          return;
        }
        if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          popupAlert("Google Play Services", "Google Play Services is missing or outdated on this device.");
          return;
        }
      }
      const message = (error as Error).message || "Sign-in failed.";
      if (message.includes("DEVELOPER_ERROR")) {
        popupAlert(
          "Google sign-in setup",
          "Android OAuth is misconfigured. In Google Cloud Console, open the Android OAuth client for package org.akanksha.capture and add your app SHA-1 fingerprints (run npm run google:setup in client/ for exact values). Then rebuild and reinstall the app."
        );
        return;
      }
      popupAlert("Google sign-in error", message);
    }
  }

  async function handleGoogleSignInPress() {
    if (Platform.OS === "web") {
      if (!request) {
        setLoginError("Google sign-in is still initializing. Please try again in a moment.");
        return;
      }
      try {
        setLoginError("");
        // Full-page redirect avoids OAuth popup COOP/window.close issues on hosted web.
        await promptAsync({ windowName: "_self" });
      } catch (error) {
        const message = (error as Error).message;
        setLoginError(message);
      }
      return;
    }
    await handleNativeGoogleSignIn();
  }

  async function loadSessionData() {
    setSessionLoading(true);
    try {
      const bootstrap = await fetchEventBootstrap(token);
      const centerList = USE_DUMMY_HUB_DATA ? getDummyCostCenters() : await fetchCostCenters(token);
      const cityList = USE_DUMMY_HUB_DATA ? [] : await fetchCities(token);
      setEvents(bootstrap.events);
      setCostCenters(centerList);
      setCities(
        USE_DUMMY_HUB_DATA
          ? citiesWithCostCenters(
              [
                { id: "dummy-city-mum", name: "Mumbai", sortOrder: 1, isActive: true },
                { id: "dummy-city-pune", name: "Pune", sortOrder: 2, isActive: true },
                { id: "dummy-city-ngp", name: "Nagpur", sortOrder: 3, isActive: true },
              ],
              centerList
            )
          : citiesWithCostCenters(cityList, centerList)
      );
    
    } finally {
      setSessionLoading(false);
    }
  }

  async function hydrateAuthenticatedSession() {
    try {
      const me = await fetchCurrentUser(token);
      setUser(me);
      await loadSessionData();
    } catch (_error) {
      handleLogout();
      if (Platform.OS === "web") {
        setLoginError("Session expired. Please sign in again.");
      } else {
        popupAlert("Session expired", "Please sign in again.");
      }
    }
  }

  /** Opens the camera; resolves true when a photo or video was taken. */
  async function handleCaptureFromCamera(): Promise<boolean> {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      popupAlert("Permission needed", "Camera permission is required.");
      return false;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: mediaType === "photo" ? ["images"] : ["videos"],
      quality: 0.7,
      videoMaxDuration: 60,
    });

    if (!result.canceled && result.assets[0]) {
      setMedia(result.assets[0]);
      return true;
    }
    return false;
  }

  /** Picks from the photo library; resolves true when something was chosen. */
  async function handlePickFromLibrary(): Promise<boolean> {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: mediaType === "photo" ? ["images"] : ["videos"],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setMedia(result.assets[0]);
      return true;
    }
    return false;
  }

  /** Clears the capture form so the next post, story or event starts empty. */
  function resetDraft() {
    setEventTitle("");
    setCaption("");
    setBody("");
    setEventDate(new Date().toISOString().slice(0, 10));
    setEventEndDate("");
    setEventLocation("");
    setMediaType("photo");
    setMedia(null);
  }

  async function handleSubmitEvent(
    costCenterId: string | null,
    cityId?: string | null,
    options: { kind?: ContentKind; parentEventId?: string; body?: string } = {}
  ): Promise<boolean> {
    const kind = options.kind ?? "event";
    const hasParent = Boolean(options.parentEventId);
    const excerpt = caption.trim() || (kind === "story" ? (options.body || "").trim().slice(0, 200) : "");

    if (!media) {
      popupAlert("Missing media", "Add a photo or video first.");
      return false;
    }
    if (kind === "event" && (!eventTitle.trim() || !eventDate || !excerpt)) {
      popupAlert("Missing fields", "Title, date, description and media are required.");
      return false;
    }
    if (kind === "post" && !excerpt) {
      popupAlert("Missing caption", "Write a short caption for the post.");
      return false;
    }
    if (kind === "story" && (!eventTitle.trim() || !(options.body || "").trim())) {
      popupAlert("Missing fields", "A story needs a title and the story text.");
      return false;
    }
    if (kind !== "event" && !hasParent && !eventDate) {
      popupAlert("Missing fields", "Pick a date, or attach this to an existing event.");
      return false;
    }

    try {
      setIsLoading(true);
      await uploadEvent({
        token,
        title: eventTitle,
        caption: excerpt,
        eventDate: hasParent ? undefined : eventDate,
        endDate: hasParent || kind !== "event" ? undefined : eventEndDate || undefined,
        mediaType,
        media,
        costCenterId: costCenterId || undefined,
        cityId: cityId || undefined,
        location: eventLocation,
        kind,
        parentEventId: options.parentEventId,
        body: kind === "story" ? options.body : undefined,
      });
      resetDraft();
      await loadSessionData();
      popupAlert(
        "Success",
        kind === "event"
          ? "Event created. It shows in the Events tab as Upcoming or Live based on its dates."
          : kind === "story"
            ? "Story published for review."
            : "Post added for review."
      );
      return true;
    } catch (error) {
      popupAlert("Upload error", (error as Error).message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  function handleLogout() {
    if (Platform.OS === "web") {
      window.localStorage.removeItem(WEB_AUTH_TOKEN_KEY);
    } else {
      void AsyncStorage.removeItem(WEB_AUTH_TOKEN_KEY).catch(() => {
        // Ignore async storage cleanup issues on logout.
      });
    }
    setLoginError("");
    setToken("");
    setUser(null);
    setCities([]);
    setCostCenters([]);
    setEvents([]);
    resetDraft();
    setIsLoading(false);
    setRoute("home");
  }

  if (route === "notFound") {
    return <NotFoundScreen onGoHome={() => setRoute("home")} onGoLogin={handleLogout} />;
  }

  // Draw a light loading screen rather than nothing: an empty tree shows as a black window on Android.
  // The branded loader needs the app fonts, so a plain version covers the moment before they load.
  if (isAuthBootstrapped === false && (fontsLoaded || fontError)) {
    return <ListLoader splash message="Getting things ready..." />;
  }
  if (!isAuthBootstrapped || !(fontsLoaded || fontError)) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 24, backgroundColor: "#f9f9ff" }}>
        <Image source={require("../assets/akanksha-logo.png")} style={{ width: 200, height: 106 }} resizeMode="contain" />
        <ActivityIndicator size="large" color="#b50c08" />
      </View>
    );
  }

  if (__DEV__ && Platform.OS === "web" && typeof window !== "undefined" && window.location.search.includes("preview=cards")) {
    return <CardPreview />;
  }
  if (__DEV__ && Platform.OS === "web" && typeof window !== "undefined" && window.location.search.includes("preview=profile")) {
    return <ProfilePreview />;
  }
  if (__DEV__ && Platform.OS === "web" && typeof window !== "undefined" && window.location.search.includes("preview=calendar")) {
    return <CalendarEventsPreview />;
  }

  if (!token || !user) {
    return (
      <LoginScreen
        isLoading={isLoading}
        canStartLogin={Platform.OS !== "web" || Boolean(request)}
        loginError={loginError}
        onLoginPress={() => {
          void handleGoogleSignInPress();
        }}
      />
    );
  }

  return (
    <HomeScreen
      token={token}
      user={user}
      cities={cities}
      costCenters={costCenters}
      events={events}
      eventTitle={eventTitle}
      caption={caption}
      eventDate={eventDate}
      eventLocation={eventLocation}
      mediaType={mediaType}
      media={media}
      isLoading={isLoading}
      onLogout={handleLogout}
      onSelectMediaType={setMediaType}
      onChangeEventDate={setEventDate}
      onChangeEventTitle={setEventTitle}
      onChangeCaption={setCaption}
      onChangeEventLocation={setEventLocation}
      onCaptureMedia={handleCaptureFromCamera}
      onPickMedia={handlePickFromLibrary}
      sessionLoading={sessionLoading}
      onReload={() => loadSessionData().catch(() => undefined)}
      onSaveEvent={handleSubmitEvent}
      body={body}
      onChangeBody={setBody}
      eventEndDate={eventEndDate}
      onChangeEventEndDate={setEventEndDate}
      onDiscardDraft={resetDraft}
    />
  );
}
