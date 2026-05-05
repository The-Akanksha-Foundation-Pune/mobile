const { uploadToGoogleDrive, isDriveFullyConfigured } = require("./drive");
const { saveLocalMedia } = require("./localMediaStorage");

let warnedAutoLocal = false;

function mediaStorageMode() {
  const m = String(process.env.MEDIA_STORAGE || "auto").toLowerCase();
  if (m === "google" || m === "drive") {
    return "google";
  }
  if (m === "local") {
    return "local";
  }
  return "auto";
}

async function uploadEventMedia({ buffer, originalName, mimeType, publicBaseUrl }) {
  const mode = mediaStorageMode();

  if (mode === "local") {
    return saveLocalMedia({ buffer, mimeType, publicBaseUrl });
  }

  if (mode === "google") {
    if (!isDriveFullyConfigured()) {
      throw Object.assign(new Error("Drive not configured"), { code: "DRIVE_NOT_CONFIGURED" });
    }
    return uploadToGoogleDrive({ buffer, originalName, mimeType });
  }

  if (isDriveFullyConfigured()) {
    return uploadToGoogleDrive({ buffer, originalName, mimeType });
  }

  if (!warnedAutoLocal) {
    console.warn(
      "MEDIA_STORAGE=auto: Google Drive is not fully configured; saving uploads under backend/uploads. Configure Drive env vars for production, or set MEDIA_STORAGE=local."
    );
    warnedAutoLocal = true;
  }

  return saveLocalMedia({ buffer, mimeType, publicBaseUrl });
}

module.exports = {
  uploadEventMedia,
};
