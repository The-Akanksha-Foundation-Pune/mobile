import { useEffect, useMemo, useState } from "react";
import { Alert, Platform } from "react-native";
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
import { useAppRoute } from "./hooks/useAppRoute";
import { HomeScreen } from "./screens/HomeScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { NotFoundScreen } from "./screens/NotFoundScreen";
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
import type { City, CostCenter, EventItem, EventType, MediaMode, SelectedMedia, User } from "./types/app";

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

export default function App() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [isAuthBootstrapped, setIsAuthBootstrapped] = useState(false);
  const { route, setRoute } = useAppRoute();

  const [cities, setCities] = useState<City[]>([]);
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [eventTitle, setEventTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [eventDate, setEventDate] = useState(new Date().toISOString().slice(0, 10));
  const [eventLocation, setEventLocation] = useState("");
  const [mediaType, setMediaType] = useState<MediaMode>("photo");
  const [media, setMedia] = useState<SelectedMedia>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

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
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID,
      // Keeps Android native flow compatible with backend audience checks.
      offlineAccess: false,
    });
  }, []);

  useEffect(() => {
    async function bootstrapAuthToken() {
      try {
        if (Platform.OS === "web") {
          const savedToken = window.localStorage.getItem(WEB_AUTH_TOKEN_KEY) || "";
          if (savedToken) setToken(savedToken);
          return;
        }
        const savedToken = (await AsyncStorage.getItem(WEB_AUTH_TOKEN_KEY)) || "";
        if (savedToken) setToken(savedToken);
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
      const idToken = response.params.id_token;
      if (!idToken) {
        const hint =
          Platform.OS === "web" && webRedirectUri
            ? ` Add redirect URI in Google Console: ${webRedirectUri}`
            : "";
        setLoginError(`Google did not return an ID token.${hint}`);
        return;
      }
      setLoginError("");
      void handleGoogleLogin(idToken);
    }
    if (response?.type === "error") {
      const errorDescription =
        response.error?.description || response.error?.message || "Google auth request failed.";
      setLoginError(errorDescription);
      if (Platform.OS !== "web") {
        Alert.alert("Google sign-in error", errorDescription);
      }
    }
    if (response?.type === "dismiss" || response?.type === "cancel") {
      setLoginError("Google sign-in cancelled. Please try again.");
      if (Platform.OS !== "web") {
        Alert.alert("Google sign-in cancelled", "Please try again to continue.");
      }
    }
  }, [response, webRedirectUri]);

  useEffect(() => {
    if (!token) return;
    void hydrateAuthenticatedSession();
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
        Alert.alert("Login error", message);
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
        Alert.alert("Google sign-in cancelled", "Please try again to continue.");
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
          Alert.alert("Google sign-in cancelled", "Please try again to continue.");
          return;
        }
        if (error.code === statusCodes.IN_PROGRESS) {
          Alert.alert("Google sign-in", "A sign-in request is already in progress.");
          return;
        }
        if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          Alert.alert("Google Play Services", "Google Play Services is missing or outdated on this device.");
          return;
        }
      }
      const message = (error as Error).message || "Sign-in failed.";
      if (message.includes("DEVELOPER_ERROR")) {
        Alert.alert(
          "Google sign-in setup",
          "Android OAuth is misconfigured. In Google Cloud Console, open the Android OAuth client for package org.akanksha.capture and add your app SHA-1 fingerprints (run npm run google:setup in client/ for exact values). Then rebuild and reinstall the app."
        );
        return;
      }
      Alert.alert("Google sign-in error", message);
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
    const bootstrap = await fetchEventBootstrap(token);
    const centerList = USE_DUMMY_HUB_DATA ? getDummyCostCenters() : await fetchCostCenters(token);
    const cityList = USE_DUMMY_HUB_DATA ? [] : await fetchCities(token);
    setEventTypes(bootstrap.eventTypes);
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
    if (!selectedTypeId && bootstrap.eventTypes.length > 0) {
      setSelectedTypeId(bootstrap.eventTypes[0].id);
    }
  }

  async function hydrateAuthenticatedSession() {
    try {
      const me = await fetchCurrentUser(token);
      setUser(me);
      await loadSessionData();
    } catch (_error) {
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

  async function handleSubmitEvent(costCenterId: string, cityId?: string | null): Promise<boolean> {
    if (!selectedTypeId || !eventTitle.trim() || !caption.trim() || !eventDate || !media) {
      Alert.alert("Missing fields", "Title, type, date, caption and media are required.");
      return false;
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
        costCenterId,
        cityId: cityId || undefined,
        location: eventLocation,
      });
      setEventTitle("");
      setCaption("");
      setEventLocation("");
      setMedia(null);
      await loadSessionData();
      Alert.alert(
        "Success",
        "Event saved for this cost center. An admin can approve it and notify donors."
      );
      return true;
    } catch (error) {
      Alert.alert("Upload error", (error as Error).message);
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
    setEventTypes([]);
    setSelectedTypeId("");
    setEventTitle("");
    setCaption("");
    setEventDate(new Date().toISOString().slice(0, 10));
    setEventLocation("");
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
      eventTypes={eventTypes}
      selectedTypeId={selectedTypeId}
      eventTitle={eventTitle}
      caption={caption}
      eventDate={eventDate}
      eventLocation={eventLocation}
      mediaType={mediaType}
      media={media}
      isLoading={isLoading}
      onLogout={handleLogout}
      onSelectMediaType={setMediaType}
      onSelectType={setSelectedTypeId}
      onChangeEventDate={setEventDate}
      onChangeEventTitle={setEventTitle}
      onChangeCaption={setCaption}
      onChangeEventLocation={setEventLocation}
      onCaptureMedia={handleCaptureFromCamera}
      onSaveEvent={handleSubmitEvent}
    />
  );
}
