const { resolvePublicBaseUrl } = require("./publicApiBase");

function resolveMediaUrlForClient(req, mediaUrl) {
  if (!mediaUrl) {
    return mediaUrl;
  }

  try {
    const parsed = new URL(mediaUrl);
    const isLoopback = parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost";
    if (!isLoopback) {
      return mediaUrl;
    }
    const base = resolvePublicBaseUrl(req);
    return `${base}${parsed.pathname}${parsed.search}`;
  } catch (_error) {
    return mediaUrl;
  }
}

module.exports = {
  resolveMediaUrlForClient,
};
