import { API_BASE_URL } from "../config/constants";

/** Rewrite loopback media URLs so devices can load files from the configured API host. */
export function resolveEventMediaUrl(mediaUrl: string): string {
  if (!mediaUrl) {
    return mediaUrl;
  }

  try {
    const parsed = new URL(mediaUrl);
    const isLoopback = parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost";
    if (!isLoopback) {
      return mediaUrl;
    }
    const apiBase = new URL(API_BASE_URL);
    return `${apiBase.origin}${parsed.pathname}${parsed.search}`;
  } catch (_error) {
    return mediaUrl;
  }
}
