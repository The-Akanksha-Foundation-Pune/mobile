import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import appConfig from "../../app.json";
import { disconnectCalendar, exchangeCalendarCode, fetchCalendarConnection, requestCalendarConnectUrl } from "../services/api";
import { requestCalendarServerAuthCode } from "../services/googleSignin";
import type { CalendarConnection } from "../types/app";

const APP_SCHEME = (appConfig as { expo?: { scheme?: string } }).expo?.scheme ?? "captureakanksha";

export type ConnectResult = { ok: true } | { ok: false; reason: string };

const IS_WEB = Platform.OS === "web" && typeof window !== "undefined";

/**
 * Where Google sends the browser back.
 * Web: the app's own origin, which is already registered on the Google web client for sign-in,
 * so Google lands on it with ?code= and the app hands the code to the backend.
 * Phone: the app's deep link, reached via the backend callback.
 */
function getReturnUrl(): string {
  if (IS_WEB) return window.location.origin;
  return `${APP_SCHEME}://calendar-connected`;
}

type CallbackParams =
  | { kind: "code"; code: string; state: string }
  | { kind: "result"; result: ConnectResult }
  | null;

/** Reads what Google (or the backend callback) put on the URL the browser session came back with. */
function parseCallbackUrl(url: string | null | undefined): CallbackParams {
  if (!url) return null;
  try {
    const params = new URL(url).searchParams;
    const code = params.get("code");
    const state = params.get("state");
    if (code && state) return { kind: "code", code, state };
    const googleError = params.get("error");
    if (googleError) {
      return { kind: "result", result: { ok: false, reason: googleError === "access_denied" ? "You cancelled the Google permission screen." : googleError } };
    }
    const status = params.get("calendar");
    if (status === "connected") return { kind: "result", result: { ok: true } };
    if (status === "error") return { kind: "result", result: { ok: false, reason: params.get("reason") || "Google did not complete the connection." } };
    return null;
  } catch {
    return null;
  }
}

const CALLBACK_PARAMS = ["code", "state", "scope", "authuser", "prompt", "hd", "error", "calendar", "reason"];

function stripCallbackParams() {
  if (!IS_WEB) return;
  const url = new URL(window.location.href);
  if (!CALLBACK_PARAMS.some((key) => url.searchParams.has(key))) return;
  CALLBACK_PARAMS.forEach((key) => url.searchParams.delete(key));
  window.history.replaceState(null, "", url.toString());
}

/**
 * Status of the user's Google Calendar link, plus connect/disconnect actions.
 * Pass `enabled: false` for users who cannot use the feature so nothing is fetched.
 */
export function useCalendarConnection(token: string, enabled: boolean, loginHint?: string) {
  const [connection, setConnection] = useState<CalendarConnection | null>(null);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled || !token) return null;
    setLoading(true);
    setError(null);
    try {
      const next = await fetchCalendarConnection(token);
      if (mounted.current) setConnection(next);
      return next;
    } catch (caught) {
      if (mounted.current) setError((caught as Error).message);
      return null;
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [enabled, token]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /** Hands a code from Google to the backend and updates the status. */
  const finishWithCode = useCallback(
    async (code: string, state: string): Promise<ConnectResult> => {
      try {
        const next = await exchangeCalendarCode(token, { code, state });
        if (mounted.current) setConnection(next);
        return next.connected ? { ok: true } : { ok: false, reason: "Google finished, but the calendar is still not connected. Please try again." };
      } catch (caught) {
        return { ok: false, reason: (caught as Error).message };
      }
    },
    [token]
  );

  /**
   * A full-page redirect (popup blocked on web) lands back here with Google's params in the URL.
   * The code is exchanged once the auth token is available; the result is handed out once.
   */
  // Inside the OAuth popup the opener handles the URL (and closes this window), so leave it alone there.
  const pendingCallback = useRef<CallbackParams>(IS_WEB && !window.opener ? parseCallbackUrl(window.location.href) : null);
  const [pendingResult, setPendingResult] = useState<ConnectResult | null>(null);
  useEffect(() => {
    const pending = pendingCallback.current;
    if (!pending) return;
    if (pending.kind === "result") {
      pendingCallback.current = null;
      stripCallbackParams();
      setPendingResult(pending.result);
      return;
    }
    if (!token || !enabled) return;
    pendingCallback.current = null;
    stripCallbackParams();
    void finishWithCode(pending.code, pending.state).then((result) => {
      if (mounted.current) setPendingResult(result);
    });
  }, [token, enabled, finishWithCode]);

  const consumePendingResult = useCallback(() => {
    const result = pendingResult;
    setPendingResult(null);
    return result;
  }, [pendingResult]);

  /** Phone: the native Google account sheet returns a server auth code; no browser or redirect URI. */
  const connectNative = useCallback(async (): Promise<ConnectResult> => {
    const result = await requestCalendarServerAuthCode(loginHint);
    if (result.type === "cancelled") return { ok: false, reason: "Connection cancelled." };
    if (result.type === "error") return { ok: false, reason: result.message };
    try {
      const next = await exchangeCalendarCode(token, { serverAuthCode: result.serverAuthCode });
      if (mounted.current) setConnection(next);
      return next.connected ? { ok: true } : { ok: false, reason: "Google finished, but the calendar is still not connected. Please try again." };
    } catch (caught) {
      return { ok: false, reason: (caught as Error).message };
    }
  }, [token, loginHint]);

  const connect = useCallback(async (): Promise<ConnectResult> => {
    if (!token) return { ok: false, reason: "You are not signed in." };
    setConnecting(true);
    setError(null);
    try {
      if (!IS_WEB) {
        const result = await connectNative();
        if (!result.ok && mounted.current && result.reason !== "Connection cancelled.") setError(result.reason);
        return result;
      }
      const returnUrl = getReturnUrl();
      const authUrl = await requestCalendarConnectUrl(token, returnUrl, IS_WEB ? "app" : "backend");
      let session: WebBrowser.WebBrowserAuthSessionResult;
      try {
        session = await WebBrowser.openAuthSessionAsync(authUrl, returnUrl, { preferEphemeralSession: false });
      } catch (popupError) {
        // Popup blocked on web: fall back to a full-page redirect; the result is read on reload.
        if (IS_WEB) {
          window.location.assign(authUrl);
          return { ok: false, reason: "Redirecting to Google..." };
        }
        throw popupError;
      }
      if (session.type !== "success") {
        return { ok: false, reason: session.type === "cancel" || session.type === "dismiss" ? "Connection cancelled." : "Google did not complete the connection." };
      }
      const parsed = parseCallbackUrl(session.url);
      if (parsed?.kind === "code") return await finishWithCode(parsed.code, parsed.state);
      if (parsed?.kind === "result" && !parsed.result.ok) return parsed.result;
      const next = await refresh();
      if (next?.connected) return { ok: true };
      return { ok: false, reason: "Google finished, but the calendar is still not connected. Please try again." };
    } catch (caught) {
      const message = (caught as Error).message;
      if (mounted.current) setError(message);
      return { ok: false, reason: message };
    } finally {
      if (mounted.current) setConnecting(false);
    }
  }, [token, refresh, finishWithCode, connectNative]);

  const disconnect = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      await disconnectCalendar(token);
      if (mounted.current) setConnection({ connected: false });
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [token]);

  return { connection, loading, connecting, error, refresh, connect, disconnect, consumePendingResult };
}
