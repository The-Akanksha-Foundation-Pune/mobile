import { GoogleSignin, isErrorWithCode, statusCodes } from "@react-native-google-signin/google-signin";
import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from "../config/constants";

export const CALENDAR_READONLY_SCOPE = "https://www.googleapis.com/auth/calendar.readonly";

/**
 * Native Google Sign-In configuration. Login uses the plain setup; the calendar connect
 * temporarily switches to offline access with the calendar scope to obtain a server auth code.
 */
export function configureGoogleSignin(options: { calendar?: boolean } = {}) {
  const calendar = Boolean(options.calendar);
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
    // Login keeps this off so the backend's ID-token audience check stays unchanged.
    offlineAccess: calendar,
    // Makes Google issue a code that yields a refresh token every time, not just the first.
    forceCodeForRefreshToken: calendar,
    scopes: calendar ? [CALENDAR_READONLY_SCOPE] : [],
  });
}

export type ServerAuthCodeResult = { type: "success"; serverAuthCode: string } | { type: "cancelled" } | { type: "error"; message: string };

/**
 * Asks the user (via the native Google account sheet) for read access to their calendar and
 * returns a one-time server auth code the backend swaps for tokens. No redirect URI is involved,
 * so this works on any phone without ngrok or extra Google Console entries.
 */
export async function requestCalendarServerAuthCode(loginHint?: string): Promise<ServerAuthCodeResult> {
  configureGoogleSignin({ calendar: true });
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // Show the account chooser rather than silently reusing the last account.
    if (GoogleSignin.hasPreviousSignIn()) await GoogleSignin.signOut();
    const result = await GoogleSignin.signIn(loginHint ? { loginHint } : undefined);
    if (result.type !== "success") return { type: "cancelled" };
    const serverAuthCode = result.data.serverAuthCode;
    if (!serverAuthCode) {
      return { type: "error", message: "Google did not return a server auth code. Check that the web client ID in the app matches the backend." };
    }
    return { type: "success", serverAuthCode };
  } catch (error) {
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) return { type: "cancelled" };
      if (error.code === statusCodes.IN_PROGRESS) return { type: "error", message: "A Google request is already in progress." };
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return { type: "error", message: "Google Play Services is missing or outdated on this device." };
      }
    }
    const message = (error as Error).message || "Google sign-in failed.";
    return {
      type: "error",
      message: /DEVELOPER_ERROR/i.test(message)
        ? "Google rejected this app build (DEVELOPER_ERROR). Add this build's SHA-1 to the Android OAuth client: cd client && npm run google:setup"
        : message,
    };
  } finally {
    configureGoogleSignin();
  }
}
