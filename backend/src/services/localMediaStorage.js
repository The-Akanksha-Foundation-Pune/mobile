const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { extensionForMimeType } = require("../lib/allowedMedia");

const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads");

async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

async function saveLocalMedia({ buffer, mimeType, publicBaseUrl }) {
  await ensureUploadDir();
  const id = crypto.randomBytes(12).toString("hex");
  const ext = extensionForMimeType(mimeType) || ".bin";
  const rawName = `${Date.now()}-${id}${ext}`;
  const safe = rawName.replace(/[^\w.\-]+/g, "_");
  await fs.writeFile(path.join(UPLOAD_DIR, safe), buffer);
  return {
    fileId: `local:${safe}`,
    // Store a relative path; API/client rewrite to PUBLIC_API_BASE_URL at read time.
    mediaUrl: `/media/${encodeURIComponent(safe)}`,
  };
}

module.exports = {
  saveLocalMedia,
};
