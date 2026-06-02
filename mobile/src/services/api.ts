import { API_BASE_URL } from "../config/constants";
import { Platform } from "react-native";
import { resolveEventMediaUrl } from "../utils/mediaUrl";
import type {
  CalendarEntry,
  City,
  CostCenter,
  EventItem,
  EventStatus,
  EventType,
  MediaMode,
  SelectedMedia,
  User,
} from "../types/app";

type AuthResponse = {
  token: string;
  user: User;
};

function getApiBaseUrl(): string {
  // Android emulators cannot access host loopback via 127.0.0.1/localhost.
  // Route local API calls to the host machine through 10.0.2.2.
  if (Platform.OS === "android") {
    return API_BASE_URL.replace("://127.0.0.1", "://10.0.2.2").replace("://localhost", "://10.0.2.2");
  }

  if (typeof window === "undefined" || !window.location?.hostname) {
    return API_BASE_URL;
  }

  const webHost = window.location.hostname;
  const isLocalWebHost = webHost === "localhost" || webHost === "127.0.0.1";
  const isLoopbackApi = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(API_BASE_URL);

  if (!isLocalWebHost && isLoopbackApi) {
    throw new Error(
      "This hosted web build is using a local API URL (127.0.0.1). Set EXPO_PUBLIC_API_BASE_URL to a public backend URL, or run the app locally with the backend."
    );
  }

  return API_BASE_URL;
}

function authHeaders(token: string, json = false) {
  return {
    Authorization: `Bearer ${token}`,
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

async function parseJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || fallbackMessage);
  }
  return data as T;
}

export async function signInWithGoogle(idToken: string): Promise<AuthResponse> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Login failed.");
  }
  return data;
}

export async function fetchCurrentUser(token: string): Promise<User> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/auth/me`, {
    headers: authHeaders(token),
  });
  return parseJson<User>(response, "Session is invalid.");
}

export async function fetchEventBootstrap(token: string): Promise<{
  eventTypes: EventType[];
  events: EventItem[];
}> {
  const baseUrl = getApiBaseUrl();
  const [typesRes, eventsRes] = await Promise.all([
    fetch(`${baseUrl}/api/types`, { headers: authHeaders(token) }),
    fetch(`${baseUrl}/api/events`, { headers: authHeaders(token) }),
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
  const response = await fetch(`${baseUrl}/api/cities`, {
    headers: authHeaders(token),
  });
  return parseJson<City[]>(response, "Failed to load cities.");
}

export async function fetchCostCenters(token: string): Promise<CostCenter[]> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/cost-centers`, {
    headers: authHeaders(token),
  });
  return parseJson<CostCenter[]>(response, "Failed to load cost centers.");
}

export async function fetchEvents(args: {
  token: string;
  costCenterId?: string;
  cityId?: string;
  status?: EventStatus;
  gallery?: boolean;
  date?: string;
}): Promise<EventItem[]> {
  const baseUrl = getApiBaseUrl();
  const params = new URLSearchParams();
  if (args.costCenterId) params.set("costCenterId", args.costCenterId);
  if (args.cityId) params.set("cityId", args.cityId);
  if (args.status) params.set("status", args.status);
  if (args.gallery) params.set("gallery", "true");
  if (args.date) params.set("date", args.date);

  const response = await fetch(`${baseUrl}/api/events?${params.toString()}`, {
    headers: authHeaders(args.token),
  });
  const events = await parseJson<EventItem[]>(response, "Failed to load events.");
  return events.map((event) => ({
    ...event,
    mediaUrl: resolveEventMediaUrl(event.mediaUrl),
  }));
}

export async function fetchCalendarEntries(args: {
  token: string;
  costCenterId: string;
  month?: string;
}): Promise<CalendarEntry[]> {
  const baseUrl = getApiBaseUrl();
  const params = new URLSearchParams({ costCenterId: args.costCenterId });
  if (args.month) params.set("month", args.month);

  const response = await fetch(`${baseUrl}/api/calendar?${params.toString()}`, {
    headers: authHeaders(args.token),
  });
  return parseJson<CalendarEntry[]>(response, "Failed to load calendar.");
}

export async function fetchAdminEvents(token: string): Promise<EventItem[]> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/admin/events`, {
    headers: authHeaders(token),
  });
  return parseJson<EventItem[]>(response, "Failed to load admin events.");
}

export async function notifyEventDonors(token: string, eventId: string): Promise<{ notifiedCount: number }> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/admin/events/${eventId}/notify-donors`, {
    method: "POST",
    headers: authHeaders(token, true),
  });
  return parseJson<{ notifiedCount: number }>(response, "Failed to notify donors.");
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
  const response = await fetch(`${baseUrl}/api/admin/events/${args.eventId}`, {
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
  const response = await fetch(`${baseUrl}/api/cost-centers/all`, {
    headers: authHeaders(token),
  });
  return parseJson<CostCenter[]>(response, "Failed to load cost centers.");
}

export async function fetchAllCitiesAdmin(token: string): Promise<City[]> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/cities/all`, {
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
  const response = await fetch(`${baseUrl}/api/cities`, {
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
  const response = await fetch(`${baseUrl}/api/calendar/all${params}`, {
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
  const response = await fetch(
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
  const response = await fetch(`${baseUrl}/api/calendar/${entryId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  await parseJson(response, "Failed to delete calendar entry.");
}

export async function uploadEvent(args: {
  token: string;
  title: string;
  caption: string;
  typeId: string;
  eventDate: string;
  mediaType: MediaMode;
  media: SelectedMedia;
  costCenterId: string;
  cityId?: string;
  location?: string;
}): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const { token, title, caption, typeId, eventDate, mediaType, media, costCenterId, cityId, location } = args;
  if (!media) {
    throw new Error("Media is required.");
  }

  const formData = new FormData();
  formData.append("title", title.trim());
  formData.append("caption", caption.trim());
  formData.append("typeId", typeId);
  formData.append("eventDate", eventDate);
  formData.append("mediaType", mediaType);
  formData.append("costCenterId", costCenterId);
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

  const response = await fetch(`${baseUrl}/api/events`, {
    method: "POST",
    headers: authHeaders(token),
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to submit event.");
  }
}

export async function polishEventDescription(args: { token: string; description: string }): Promise<string> {
  const { token, description } = args;
  const text = description.trim();
  if (!text) {
    throw new Error("Add a description before polishing.");
  }
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/ai/polish-description`, {
    method: "POST",
    headers: authHeaders(token, true),
    body: JSON.stringify({ description: text }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.message || "Failed to polish description.");
  }

  const polished = data?.polished?.trim();
  if (!polished) {
    throw new Error("No polished text was returned.");
  }
  return polished;
}
