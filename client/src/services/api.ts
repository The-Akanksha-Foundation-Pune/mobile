import Constants from "expo-constants";
import { API_BASE_URL } from "../config/constants";
import { Platform } from "react-native";
import { resolveEventMediaUrl } from "../utils/mediaUrl";
import type {
  AppLimits,
  CalendarConnection,
  CalendarEntry,
  CalendarImportResult,
  GoogleCalendarEventsPage,
  City,
  ContentKind,
  EventDetail,
  CostCenter,
  EventItem,
  EventStatus,
  EventType,
  MediaMode,
  Permission,
  ProfileUpdate,
  ReviewStatus,
  SelectedMedia,
  User,
  UserRole,
} from "../types/app";

type AuthResponse = {
  token: string;
  user: User;
};

const LOOPBACK_API_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

function isLoopbackApiUrl(url: string): boolean {
  return LOOPBACK_API_PATTERN.test(url);
}

function rewriteLoopbackForAndroidEmulator(url: string): string {
  return url.replace("://127.0.0.1", "://10.0.2.2").replace("://localhost", "://10.0.2.2");
}

export function getApiBaseUrl(): string {
  const isAndroidEmulator = Platform.OS === "android" && !Constants.isDevice;

  // Android emulators cannot reach the dev machine via 127.0.0.1; use 10.0.2.2 instead.
  if (isAndroidEmulator && isLoopbackApiUrl(API_BASE_URL)) {
    return rewriteLoopbackForAndroidEmulator(API_BASE_URL);
  }

  // Physical phones cannot reach a laptop backend at 127.0.0.1/localhost.
  if (Platform.OS !== "web" && Constants.isDevice && isLoopbackApiUrl(API_BASE_URL)) {
    throw new Error(
      "Backend URL is set to 127.0.0.1, which does not work on a physical phone. Set EXPO_PUBLIC_API_BASE_URL to your computer's LAN IP (e.g. http://192.168.1.5:4000), start the backend, then rebuild the app."
    );
  }

  if (typeof window === "undefined" || !window.location?.hostname) {
    return API_BASE_URL;
  }

  const webHost = window.location.hostname;
  const isLocalWebHost = webHost === "localhost" || webHost === "127.0.0.1";

  if (!isLocalWebHost && isLoopbackApiUrl(API_BASE_URL)) {
    throw new Error(
      "This hosted web build is using a local API URL (127.0.0.1). Set EXPO_PUBLIC_API_BASE_URL to a public backend URL, or run the app locally with the backend."
    );
  }

  return API_BASE_URL;
}

function isNgrokApiBase(url: string): boolean {
  try {
    return new URL(url).hostname.includes("ngrok");
  } catch {
    return false;
  }
}

/** ngrok free tier returns an HTML interstitial unless this header is sent. */
export function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (isNgrokApiBase(url)) {
    headers.set("ngrok-skip-browser-warning", "69420");
  }
  return fetch(url, { ...init, headers });
}

function isNonJsonResponseError(message: string): boolean {
  return /json parse error|unexpected character|unexpected token/i.test(message);
}

async function readJsonResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  const text = await response.text();
  if (!text.trim()) {
    throw new Error(fallbackMessage);
  }
  try {
    const data = JSON.parse(text) as T;
    if (!response.ok) {
      throw new Error((data as { message?: string })?.message || fallbackMessage);
    }
    return data;
  } catch (error) {
    if (error instanceof Error && error.message !== fallbackMessage && !isNonJsonResponseError(error.message)) {
      throw error;
    }
    if (error instanceof SyntaxError || isNonJsonResponseError(String(error))) {
      const preview = text.trim().slice(0, 80);
      if (/ngrok|offline|too many requests/i.test(text)) {
        throw new Error(
          "Backend tunnel is offline or ngrok blocked the request. On your Mac run: npm run dev:backend and npm run tunnel:ngrok, then verify /health on the phone."
        );
      }
      throw new Error(
        `Backend returned non-JSON (HTTP ${response.status}). ${preview ? `Response: ${preview}` : fallbackMessage}`
      );
    }
    throw error;
  }
}

function rethrowApiError(error: unknown, baseUrl: string): never {
  const message = error instanceof Error ? error.message : String(error);
  if (isNonJsonResponseError(message)) {
    if (isNgrokApiBase(baseUrl)) {
      throw new Error(
        "Backend tunnel is offline or ngrok returned a warning page instead of JSON. Keep the backend and ngrok running on your Mac, open /health on the phone, then reinstall the latest APK."
      );
    }
    throw new Error(`Backend returned non-JSON. Open ${baseUrl}/health in a browser to verify.`);
  }
  throw formatNetworkError(error, baseUrl);
}

function formatNetworkError(error: unknown, baseUrl: string): Error {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("Network request failed") || message.includes("Failed to fetch")) {
    const isNgrok = isNgrokApiBase(baseUrl);
    const isLan = /^https?:\/\/192\.168\.|^https?:\/\/10\.|^https?:\/\/172\.(1[6-9]|2\d|3[01])\./i.test(
      baseUrl
    );
    const hint = isNgrok
      ? "Ensure the backend and ngrok tunnel are running on the host machine, then open /health in a browser. If the ngrok URL changed, run npm run api:sync-ngrok and reinstall the app."
      : isLan
        ? "Ensure the backend is running, your phone is on the same Wi‑Fi, and EXPO_PUBLIC_API_BASE_URL uses your computer's LAN IP—not 127.0.0.1."
        : "Ensure the backend is reachable at this URL (try /health in a browser) and EXPO_PUBLIC_API_BASE_URL is not 127.0.0.1 on a physical device.";
    return new Error(`Cannot reach the backend at ${baseUrl}. ${hint}`);
  }
  return error instanceof Error ? error : new Error(message);
}

function authHeaders(token: string, json = false) {
  return {
    Authorization: `Bearer ${token}`,
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

async function parseJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  return readJsonResponse<T>(response, fallbackMessage);
}

export async function signInWithGoogle(idToken: string): Promise<AuthResponse> {
  const baseUrl = getApiBaseUrl();
  try {
    const response = await apiFetch(`${baseUrl}/api/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });

    return readJsonResponse<AuthResponse>(response, "Login failed.");
  } catch (error) {
    rethrowApiError(error, baseUrl);
  }
}

export async function fetchCurrentUser(token: string): Promise<User> {
  const baseUrl = getApiBaseUrl();
  const response = await apiFetch(`${baseUrl}/api/auth/me`, {
    headers: authHeaders(token),
  });
  return parseJson<User>(response, "Session is invalid.");
}

export async function updateProfile(token: string, update: ProfileUpdate): Promise<User> {
  const baseUrl = getApiBaseUrl();
  const response = await apiFetch(`${baseUrl}/api/auth/me`, {
    method: "PATCH",
    headers: { ...authHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify(update),
  });
  return parseJson<User>(response, "Failed to update profile.");
}

export type AccessUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleLabel: string;
  permissions: Permission[];
  cityName: string;
  costCenterCode: string;
  createdAt: string;
};

export async function fetchAccessUsers(token: string, query = ""): Promise<AccessUser[]> {
  const baseUrl = getApiBaseUrl();
  const params = query ? `?q=${encodeURIComponent(query)}` : "";
  const response = await apiFetch(`${baseUrl}/api/access/users${params}`, { headers: authHeaders(token) });
  return parseJson<AccessUser[]>(response, "Failed to load users.");
}

export async function updateUserRole(token: string, userId: string, role: UserRole): Promise<AccessUser> {
  const baseUrl = getApiBaseUrl();
  const response = await apiFetch(`${baseUrl}/api/access/users/${userId}/role`, {
    method: "PATCH",
    headers: authHeaders(token, true),
    body: JSON.stringify({ role }),
  });
  return parseJson<AccessUser>(response, "Failed to update role.");
}

export async function fetchSettings(token: string): Promise<{ limits: AppLimits }> {
  const baseUrl = getApiBaseUrl();
  const response = await apiFetch(`${baseUrl}/api/settings`, { headers: authHeaders(token) });
  return parseJson<{ limits: AppLimits }>(response, "Failed to load settings.");
}

export async function updateLimits(token: string, limits: AppLimits): Promise<{ limits: AppLimits }> {
  const baseUrl = getApiBaseUrl();
  const response = await apiFetch(`${baseUrl}/api/settings/limits`, {
    method: "PATCH",
    headers: authHeaders(token, true),
    body: JSON.stringify(limits),
  });
  return parseJson<{ limits: AppLimits }>(response, "Failed to save limits.");
}

export async function fetchEventBootstrap(token: string): Promise<{
  eventTypes: EventType[];
  events: EventItem[];
}> {
  const baseUrl = getApiBaseUrl();
  const [typesRes, eventsRes] = await Promise.all([
    apiFetch(`${baseUrl}/api/types`, { headers: authHeaders(token) }),
    apiFetch(`${baseUrl}/api/events`, { headers: authHeaders(token) }),
  ]);

  const typeData = await typesRes.json();
  const eventData = await eventsRes.json();

  if (!typesRes.ok || !eventsRes.ok) {
    throw new Error("Failed to load event data.");
  }

  return {
    eventTypes: typeData,
    events: eventData,
  };
}

export async function fetchCities(token: string): Promise<City[]> {
  const baseUrl = getApiBaseUrl();
  const response = await apiFetch(`${baseUrl}/api/cities`, {
    headers: authHeaders(token),
  });
  return parseJson<City[]>(response, "Failed to load cities.");
}

export async function fetchCostCenters(token: string): Promise<CostCenter[]> {
  const baseUrl = getApiBaseUrl();
  const response = await apiFetch(`${baseUrl}/api/cost-centers`, {
    headers: authHeaders(token),
  });
  return parseJson<CostCenter[]>(response, "Failed to load cost centers.");
}

export async function fetchEvents(args: {
  token: string;
  kind?: ContentKind;
  parentEventId?: string;
  costCenterId?: string;
  cityId?: string;
  status?: EventStatus;
  gallery?: boolean;
  date?: string;
}): Promise<EventItem[]> {
  const baseUrl = getApiBaseUrl();
  const params = new URLSearchParams();
  if (args.kind) params.set("kind", args.kind);
  if (args.parentEventId) params.set("parentEventId", args.parentEventId);
  if (args.costCenterId) params.set("costCenterId", args.costCenterId);
  if (args.cityId) params.set("cityId", args.cityId);
  if (args.status) params.set("status", args.status);
  if (args.gallery) params.set("gallery", "true");
  if (args.date) params.set("date", args.date);

  const response = await apiFetch(`${baseUrl}/api/events?${params.toString()}`, {
    headers: authHeaders(args.token),
  });
  const events = await parseJson<EventItem[]>(response, "Failed to load events.");
  return events.map((event) => ({
    ...event,
    mediaUrl: resolveEventMediaUrl(event.mediaUrl),
  }));
}

/** One event plus the posts and stories attached to it. */
export async function fetchEventDetail(token: string, eventId: string): Promise<EventDetail> {
  const baseUrl = getApiBaseUrl();
  const response = await apiFetch(`${baseUrl}/api/events/${eventId}`, { headers: authHeaders(token) });
  const data = await parseJson<EventItem & Omit<EventDetail, "event">>(response, "Failed to load event.");
  const { posts, stories, limits, myCounts, remaining, ...event } = data;
  const withMedia = (item: EventItem): EventItem => ({ ...item, mediaUrl: resolveEventMediaUrl(item.mediaUrl) });
  return { event: withMedia(event), posts: posts.map(withMedia), stories: stories.map(withMedia), limits, myCounts, remaining };
}

export async function fetchCalendarEntries(args: {
  token: string;
  costCenterId?: string;
  cityId?: string;
  month?: string;
}): Promise<CalendarEntry[]> {
  const baseUrl = getApiBaseUrl();
  const params = new URLSearchParams();
  if (args.costCenterId) params.set("costCenterId", args.costCenterId);
  else if (args.cityId) params.set("cityId", args.cityId);
  if (args.month) params.set("month", args.month);

  const response = await apiFetch(`${baseUrl}/api/calendar?${params.toString()}`, {
    headers: authHeaders(args.token),
  });
  return parseJson<CalendarEntry[]>(response, "Failed to load calendar.");
}

export async function fetchAdminEvents(token: string): Promise<EventItem[]> {
  const baseUrl = getApiBaseUrl();
  const response = await apiFetch(`${baseUrl}/api/admin/events`, {
    headers: authHeaders(token),
  });
  return parseJson<EventItem[]>(response, "Failed to load admin events.");
}

export async function notifyEventDonors(token: string, eventId: string): Promise<{ notifiedCount: number }> {
  const baseUrl = getApiBaseUrl();
  const response = await apiFetch(`${baseUrl}/api/admin/events/${eventId}/notify-donors`, {
    method: "POST",
    headers: authHeaders(token, true),
  });
  return parseJson<{ notifiedCount: number }>(response, "Failed to notify donors.");
}

export type ReviewPayload = { status: ReviewStatus };

export async function reviewEvent(token: string, eventId: string, payload: ReviewPayload): Promise<EventItem> {
  const baseUrl = getApiBaseUrl();
  const response = await apiFetch(`${baseUrl}/api/admin/events/${eventId}/review`, {
    method: "PATCH",
    headers: authHeaders(token, true),
    body: JSON.stringify(payload),
  });
  return parseJson<EventItem>(response, "Failed to update review.");
}

export async function bulkReviewEvents(
  token: string,
  eventIds: string[],
  status: ReviewStatus
): Promise<{ updated: number }> {
  const baseUrl = getApiBaseUrl();
  const response = await apiFetch(`${baseUrl}/api/admin/events/bulk-review`, {
    method: "POST",
    headers: authHeaders(token, true),
    body: JSON.stringify({ eventIds, status }),
  });
  return parseJson<{ updated: number }>(response, "Failed to update reviews.");
}

export async function moderateEvent(args: {
  token: string;
  eventId: string;
  eventStatus?: EventStatus;
  approvedForGallery?: boolean;
  costCenterId?: string;
  cityId?: string | null;
  location?: string | null;
}): Promise<EventItem> {
  const baseUrl = getApiBaseUrl();
  const response = await apiFetch(`${baseUrl}/api/admin/events/${args.eventId}`, {
    method: "PATCH",
    headers: authHeaders(args.token, true),
    body: JSON.stringify({
      ...(args.eventStatus !== undefined ? { eventStatus: args.eventStatus } : {}),
      ...(args.approvedForGallery !== undefined ? { approvedForGallery: args.approvedForGallery } : {}),
      ...(args.cityId !== undefined ? { cityId: args.cityId } : {}),
      ...(args.location !== undefined ? { location: args.location } : {}),
    }),
  });
  return parseJson<EventItem>(response, "Failed to update event.");
}

export async function fetchAllCostCentersAdmin(token: string): Promise<CostCenter[]> {
  const baseUrl = getApiBaseUrl();
  const response = await apiFetch(`${baseUrl}/api/cost-centers/all`, {
    headers: authHeaders(token),
  });
  return parseJson<CostCenter[]>(response, "Failed to load cost centers.");
}

export type CostCenterInput = {
  code?: string;
  name?: string;
  cityId?: string;
  isActive?: boolean;
};

export async function createCostCenterAdmin(token: string, input: CostCenterInput): Promise<CostCenter> {
  const baseUrl = getApiBaseUrl();
  const response = await apiFetch(`${baseUrl}/api/cost-centers`, {
    method: "POST",
    headers: authHeaders(token, true),
    body: JSON.stringify(input),
  });
  return parseJson<CostCenter>(response, "Failed to create cost center.");
}

export async function updateCostCenterAdmin(token: string, costCenterId: string, input: CostCenterInput): Promise<CostCenter> {
  const baseUrl = getApiBaseUrl();
  const response = await apiFetch(`${baseUrl}/api/cost-centers/${encodeURIComponent(costCenterId)}`, {
    method: "PATCH",
    headers: authHeaders(token, true),
    body: JSON.stringify(input),
  });
  return parseJson<CostCenter>(response, "Failed to update cost center.");
}

export async function fetchAllCitiesAdmin(token: string): Promise<City[]> {
  const baseUrl = getApiBaseUrl();
  const response = await apiFetch(`${baseUrl}/api/cities/all`, {
    headers: authHeaders(token),
  });
  return parseJson<City[]>(response, "Failed to load cities.");
}

export async function createCityAdmin(args: {
  token: string;
  name: string;
  state?: string;
}): Promise<City> {
  const baseUrl = getApiBaseUrl();
  const response = await apiFetch(`${baseUrl}/api/cities`, {
    method: "POST",
    headers: authHeaders(args.token, true),
    body: JSON.stringify({
      name: args.name,
      ...(args.state !== undefined ? { state: args.state } : {}),
    }),
  });
  return parseJson<City>(response, "Failed to create city.");
}

export async function fetchAdminCalendar(token: string, cityId?: string): Promise<CalendarEntry[]> {
  const baseUrl = getApiBaseUrl();
  const params = cityId ? `?cityId=${encodeURIComponent(cityId)}` : "";
  const response = await apiFetch(`${baseUrl}/api/calendar/all${params}`, {
    headers: authHeaders(token),
  });
  return parseJson<CalendarEntry[]>(response, "Failed to load admin calendar.");
}

export async function upsertCalendarEntry(args: {
  token: string;
  payload: {
    title: string;
    description?: string;
    eventDate: string;
    endDate?: string | null;
    location?: string;
    costCenterId: string;
    cityId?: string | null;
    isPublished?: boolean;
  };
  entryId?: string;
}): Promise<CalendarEntry> {
  const baseUrl = getApiBaseUrl();
  const response = await apiFetch(
    args.entryId ? `${baseUrl}/api/calendar/${args.entryId}` : `${baseUrl}/api/calendar`,
    {
      method: args.entryId ? "PATCH" : "POST",
      headers: authHeaders(args.token, true),
      body: JSON.stringify(args.payload),
    }
  );
  return parseJson<CalendarEntry>(response, "Failed to save calendar entry.");
}

export async function deleteCalendarEntry(token: string, entryId: string): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const response = await apiFetch(`${baseUrl}/api/calendar/${entryId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  await parseJson(response, "Failed to delete calendar entry.");
}

export async function uploadEvent(args: {
  token: string;
  title?: string;
  caption: string;
  typeId?: string;
  eventDate?: string;
  endDate?: string;
  mediaType: MediaMode;
  media: SelectedMedia;
  costCenterId?: string | null;
  cityId?: string;
  location?: string;
  kind?: ContentKind;
  parentEventId?: string;
  body?: string;
}): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const { token, title, caption, typeId, eventDate, endDate, mediaType, media, costCenterId, cityId, location, kind, parentEventId, body } = args;
  if (!media) {
    throw new Error("Media is required.");
  }

  const formData = new FormData();
  if (title?.trim()) formData.append("title", title.trim());
  formData.append("caption", caption.trim());
  if (typeId) formData.append("typeId", typeId);
  if (eventDate) formData.append("eventDate", eventDate);
  if (endDate) formData.append("endDate", endDate);
  formData.append("mediaType", mediaType);
  if (kind) formData.append("kind", kind);
  if (parentEventId) formData.append("parentEventId", parentEventId);
  if (body?.trim()) formData.append("body", body.trim());
  if (costCenterId) formData.append("costCenterId", costCenterId);
  if (cityId) formData.append("cityId", cityId);
  if (location?.trim()) formData.append("location", location.trim());

  const mediaFile = (media as { file?: File }).file;
  if (typeof window !== "undefined" && mediaFile instanceof File) {
    formData.append("media", mediaFile, mediaFile.name);
  } else {
    formData.append("media", {
      uri: media.uri,
      name: media.fileName || `upload-${Date.now()}`,
      type: media.mimeType || (mediaType === "photo" ? "image/jpeg" : "video/mp4"),
    } as unknown as Blob);
  }

  const response = await apiFetch(`${baseUrl}/api/events`, {
    method: "POST",
    headers: authHeaders(token),
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to submit event.");
  }
}

export type PolishEventDescriptionContext = {
  title?: string;
  cityName?: string;
  costCenterName?: string;
  costCenterCode?: string;
  eventTypeName?: string;
  location?: string;
  eventDate?: string;
};

export type PolishEventDescriptionResult = {
  polished: string;
  /** Polishes left for this draft; null when the server is not tracking this request. */
  remaining: number | null;
  limit: number;
  /** True when Google AI was unavailable (quota or credit) and a local cleanup was used instead. */
  fallback: boolean;
  /** Explanation to show the user when `fallback` is true. */
  message?: string;
};

/** Thrown when the per-draft polish allowance is used up. */
export class PolishLimitError extends Error {
  readonly limit: number;
  constructor(message: string, limit: number) {
    super(message);
    this.name = "PolishLimitError";
    this.limit = limit;
  }
}

export async function polishEventDescription(args: {
  token: string;
  description: string;
  /** Stable id for the form being edited; the server counts polishes against it. */
  draftId: string;
  kind: ContentKind;
  context?: PolishEventDescriptionContext;
}): Promise<PolishEventDescriptionResult> {
  const { token, description, draftId, kind, context } = args;
  const text = description.trim();
  if (!text) {
    throw new Error("Add a description before polishing.");
  }
  const baseUrl = getApiBaseUrl();
  const response = await apiFetch(`${baseUrl}/api/ai/polish-description`, {
    method: "POST",
    headers: authHeaders(token, true),
    body: JSON.stringify({ description: text, draftId, kind, ...context }),
  });

  const data = await response.json();
  if (!response.ok) {
    if (data?.code === "polish_limit") {
      throw new PolishLimitError(data?.message || "No AI polishes left for this draft.", Number(data?.limit) || 0);
    }
    throw new Error(data?.message || "Failed to polish description.");
  }

  const polished = data?.polished?.trim();
  if (!polished) {
    throw new Error("No polished text was returned.");
  }
  return {
    polished,
    remaining: typeof data?.remaining === "number" ? data.remaining : null,
    limit: Number(data?.limit) || 0,
    fallback: Boolean(data?.fallback),
    message: typeof data?.message === "string" ? data.message : undefined,
  };
}

// ---- Google Calendar connection (Special Access) ----

export class CalendarDisconnectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CalendarDisconnectedError";
  }
}

async function parseCalendarJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  const text = await response.text();
  let data: { message?: string; code?: string } & T;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Backend returned non-JSON (HTTP ${response.status}). ${fallbackMessage}`);
  }
  if (!response.ok) {
    const message = data?.message || fallbackMessage;
    if (data?.code === "calendar_disconnected" || data?.code === "calendar_not_connected") {
      throw new CalendarDisconnectedError(message);
    }
    throw new Error(message);
  }
  return data;
}

export async function fetchCalendarConnection(token: string): Promise<CalendarConnection> {
  const baseUrl = getApiBaseUrl();
  const response = await apiFetch(`${baseUrl}/api/calendar/google/status`, { headers: authHeaders(token) });
  return parseCalendarJson<CalendarConnection>(response, "Could not check the calendar connection.");
}

/**
 * Asks the backend for the Google consent URL; the app then opens it in a browser session.
 * redirectMode "app" (web): Google returns straight to returnUrl with ?code=, which the app
 * then posts to exchangeCalendarCode. "backend" (phones): Google returns via the server callback.
 */
export async function requestCalendarConnectUrl(
  token: string,
  returnUrl: string,
  redirectMode: "app" | "backend" = "backend"
): Promise<string> {
  const baseUrl = getApiBaseUrl();
  const response = await apiFetch(`${baseUrl}/api/calendar/google/connect`, {
    method: "POST",
    headers: authHeaders(token, true),
    body: JSON.stringify({ returnUrl, redirectMode }),
  });
  const data = await parseCalendarJson<{ url: string }>(response, "Could not start the calendar connection.");
  return data.url;
}

/** Web passes the code and state Google returned; phones pass the native SDK's serverAuthCode. */
export async function exchangeCalendarCode(
  token: string,
  args: { code: string; state: string } | { serverAuthCode: string }
): Promise<CalendarConnection> {
  const baseUrl = getApiBaseUrl();
  const response = await apiFetch(`${baseUrl}/api/calendar/google/exchange`, {
    method: "POST",
    headers: authHeaders(token, true),
    body: JSON.stringify(args),
  });
  return parseCalendarJson<CalendarConnection>(response, "Could not complete the calendar connection.");
}

export async function disconnectCalendar(token: string): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const response = await apiFetch(`${baseUrl}/api/calendar/google`, { method: "DELETE", headers: authHeaders(token) });
  await parseCalendarJson<{ connected: false }>(response, "Could not disconnect the calendar.");
}

export async function fetchGoogleCalendarEvents(
  token: string,
  range: { from?: Date; to?: Date; max?: number } = {}
): Promise<GoogleCalendarEventsPage> {
  const baseUrl = getApiBaseUrl();
  const params = new URLSearchParams();
  if (range.from) params.set("from", range.from.toISOString());
  if (range.to) params.set("to", range.to.toISOString());
  if (range.max) params.set("max", String(range.max));
  const query = params.toString();
  const response = await apiFetch(`${baseUrl}/api/calendar/google/events${query ? `?${query}` : ""}`, {
    headers: authHeaders(token),
  });
  return parseCalendarJson<GoogleCalendarEventsPage>(response, "Could not load events from Google Calendar.");
}

export async function importGoogleCalendarEvents(
  token: string,
  args: { eventIds: string[]; costCenterId: string; cityId?: string | null }
): Promise<CalendarImportResult> {
  const baseUrl = getApiBaseUrl();
  const response = await apiFetch(`${baseUrl}/api/calendar/google/import`, {
    method: "POST",
    headers: authHeaders(token, true),
    body: JSON.stringify(args),
  });
  return parseCalendarJson<CalendarImportResult>(response, "Could not import the selected events.");
}
