const { Readable } = require("stream");
const { google } = require("googleapis");

function getGooglePrivateKey() {
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || "";
  return rawKey.replace(/\\n/g, "\n");
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
};
