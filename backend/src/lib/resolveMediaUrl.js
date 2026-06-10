const { resolvePublicBaseUrl } = require("./publicApiBase");
const { isRewritableDevMediaHost } = require("./mediaHost");

function resolveMediaUrlForClient(req, mediaUrl) {
  if (!mediaUrl) {
    return mediaUrl;
  }

  const base = resolvePublicBaseUrl(req).replace(/\/$/, "");

  if (mediaUrl.startsWith("/media/")) {
    return `${base}${mediaUrl}`;
  }

  try {
    const parsed = new URL(mediaUrl);
    if (!isRewritableDevMediaHost(parsed.hostname)) {
      return mediaUrl;
    }
    return `${base}${parsed.pathname}${parsed.search}`;
  } catch (_error) {
    return mediaUrl;
  }
}

module.exports = {
  resolveMediaUrlForClient,
};
