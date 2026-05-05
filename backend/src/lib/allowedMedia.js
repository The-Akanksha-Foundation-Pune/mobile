/**
 * Strict allowlist for event uploads and local disk filenames.
 * Extensions are derived only from MIME type — never from client-provided filenames.
 */

const MIME_TO_EXT = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "image/heif": ".heif",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
  "video/x-m4v": ".m4v",
};

const ALLOWED_MIMES = new Set(Object.keys(MIME_TO_EXT));

function normalizeMime(mimeType) {
  if (!mimeType || typeof mimeType !== "string") {
    return "";
  }
  return mimeType.toLowerCase().split(";")[0].trim();
}

function isAllowedMediaMime(mimeType) {
  return ALLOWED_MIMES.has(normalizeMime(mimeType));
}

/** Safe extension for stored files; never trust original filename. */
function extensionForMimeType(mimeType) {
  return MIME_TO_EXT[normalizeMime(mimeType)] || null;
}

function mimeMatchesDeclaredMediaType(mediaType, mimeType) {
  const m = normalizeMime(mimeType);
  if (!m) {
    return false;
  }
  if (mediaType === "photo") {
    return m.startsWith("image/");
  }
  if (mediaType === "video") {
    return m.startsWith("video/");
  }
  return false;
}

module.exports = {
  ALLOWED_MIMES,
  MIME_TO_EXT,
  normalizeMime,
  isAllowedMediaMime,
  extensionForMimeType,
  mimeMatchesDeclaredMediaType,
};
