import { API_BASE_URL } from "../config/constants";

function isLoopbackHost(hostname: string): boolean {
  return hostname === "127.0.0.1" || hostname === "localhost";
}

function isPrivateLanHost(hostname: string): boolean {
  if (!hostname) return false;
  if (isLoopbackHost(hostname)) return true;

  const parts = hostname.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) {
    return false;
  }

  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function publicApiOrigin(): string {
  try {
    return new URL(API_BASE_URL).origin;
  } catch {
    return API_BASE_URL.replace(/\/$/, "");
  }
}

/** Rewrite loopback/LAN media URLs so HTTPS web builds load files from the configured API host. */
export function resolveEventMediaUrl(mediaUrl: string): string {
  if (!mediaUrl) {
    return mediaUrl;
  }

  const origin = publicApiOrigin();

  if (mediaUrl.startsWith("/media/")) {
    return `${origin}${mediaUrl}`;
  }

  try {
    const parsed = new URL(mediaUrl);
    if (!isPrivateLanHost(parsed.hostname)) {
      return mediaUrl;
    }
    return `${origin}${parsed.pathname}${parsed.search}`;
  } catch (_error) {
    return mediaUrl;
  }
}
