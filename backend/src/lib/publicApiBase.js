/**
 * Base URL for links returned to clients (e.g. local media mediaUrl).
 * Prefer PUBLIC_API_BASE_URL; otherwise use the request Host; if missing, localhost + PORT.
 */
function resolvePublicBaseUrl(req) {
  const fromEnv = (process.env.PUBLIC_API_BASE_URL || "").trim();
  if (fromEnv) {
    return fromEnv.replace(/\/$/, "");
  }

  const host = req?.get?.("host");
  if (host && host !== "undefined") {
    const proto = req?.protocol === "https" ? "https" : "http";
    return `${proto}://${host}`.replace(/\/$/, "");
  }

  const port = Number(process.env.PORT || 4000);
  return `http://127.0.0.1:${port}`;
}

module.exports = {
  resolvePublicBaseUrl,
};
