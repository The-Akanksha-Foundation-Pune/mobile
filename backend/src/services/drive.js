const { Readable } = require("stream");
const { google } = require("googleapis");

function getGooglePrivateKey() {
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "";
  const trimmed = rawKey.trim();
  const unquoted =
    trimmed.startsWith('"') && trimmed.endsWith('"') ? trimmed.slice(1, -1).trim() : trimmed;
  const normalized = unquoted.replace(/\\n/g, "\n");

  if (!normalized) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is not configured.");
  }

  const looksLikePem =
    normalized.includes("-----BEGIN PRIVATE KEY-----") &&
    normalized.includes("-----END PRIVATE KEY-----");
  const stillPlaceholder = normalized.includes("\n...\n");

  if (!looksLikePem || stillPlaceholder) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY is invalid. Set the full service account private key PEM in backend .env (replace literal \\n with new lines or keep escaped \\n)."
    );
  }

  return normalized;
}

function isDriveFullyConfigured() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_DRIVE_FOLDER_ID) {
    return false;
  }
  try {
    getGooglePrivateKey();
    return true;
  } catch {
    return false;
  }
}

function getDriveClient() {
  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    key: getGooglePrivateKey(),
    scopes: ["https://www.googleapis.com/auth/drive.file"],
  });

  return google.drive({ version: "v3", auth });
}

async function uploadToGoogleDrive({ buffer, originalName, mimeType }) {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) {
    throw new Error("GOOGLE_DRIVE_FOLDER_ID is not configured.");
  }

  const drive = getDriveClient();
  const safeName = `${Date.now()}-${originalName.replace(/\s+/g, "_")}`;

  const createdFile = await drive.files.create({
    requestBody: {
      name: safeName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: "id, webViewLink, webContentLink",
  });

  if (!createdFile.data.id) {
    throw new Error("Google Drive upload failed to return file id.");
  }

  await drive.permissions.create({
    fileId: createdFile.data.id,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  return {
    fileId: createdFile.data.id,
    mediaUrl: createdFile.data.webContentLink || createdFile.data.webViewLink || "",
  };
}

module.exports = {
  uploadToGoogleDrive,
  isDriveFullyConfigured,
};
