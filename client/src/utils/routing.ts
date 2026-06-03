import type { AppRoute } from "../types/app";

export function resolveRoute(url: string | null): AppRoute {
  if (!url) {
    return "home";
  }

  try {
    const parsedUrl = new URL(url);
    const normalizedPath = parsedUrl.pathname
      .replace(/^\/+/, "")
      .replace(/^--\//, "")
      .replace(/\/+$/, "");

    if (!normalizedPath || normalizedPath === "home" || normalizedPath === "login") {
      return "home";
    }
    return "notFound";
  } catch (_error) {
    return "notFound";
  }
}
