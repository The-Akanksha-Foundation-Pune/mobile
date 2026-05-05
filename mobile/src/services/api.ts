import { API_BASE_URL } from "../config/constants";
import type { EventItem, EventType, MediaMode, SelectedMedia, User } from "../types/app";

type AuthResponse = {
  token: string;
  user: User;
};

function getApiBaseUrl(): string {
  if (typeof window === "undefined") {
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

export async function signInWithGoogle(idToken: string): Promise<AuthResponse> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/auth/google`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error("Auth request failed", {
      status: response.status,
      data,
    });
    throw new Error(data.message || "Login failed.");
  }
  return data;
}

export async function fetchEventBootstrap(token: string): Promise<{
  eventTypes: EventType[];
  events: EventItem[];
}> {
  const baseUrl = getApiBaseUrl();
  const [typesRes, eventsRes] = await Promise.all([
    fetch(`${baseUrl}/api/types`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
    fetch(`${baseUrl}/api/events`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
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

export async function uploadEvent(args: {
  token: string;
  caption: string;
  typeId: string;
  eventDate: string;
  mediaType: MediaMode;
  media: SelectedMedia;
}): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const { token, caption, typeId, eventDate, mediaType, media } = args;
  if (!media) {
    throw new Error("Media is required.");
  }

  const formData = new FormData();
  formData.append("caption", caption.trim());
  formData.append("typeId", typeId);
  formData.append("eventDate", eventDate);
  formData.append("mediaType", mediaType);
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
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Failed to submit event.");
  }
}
