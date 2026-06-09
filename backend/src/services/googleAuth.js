const { OAuth2Client } = require("google-auth-library");

const googleClient = new OAuth2Client();

function getAllowedGoogleClientIds() {
  const rawIds = [
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_WEB_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID,
    process.env.GOOGLE_IOS_CLIENT_ID,
    process.env.GOOGLE_CLIENT_IDS,
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).split(","))
    .map((value) => value.trim())
    .filter(Boolean);

  return [...new Set(rawIds)];
}

async function verifyGoogleIdToken(idToken) {
  const audiences = getAllowedGoogleClientIds();
  if (audiences.length === 0) {
    throw new Error("No Google OAuth client IDs configured in backend env.");
  }

  const ticket = await googleClient.verifyIdToken({
    idToken,
    audience: audiences,
  });

  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email) {
    throw new Error("Google token payload is missing required fields.");
  }

  return payload;
}

module.exports = {
  getAllowedGoogleClientIds,
  verifyGoogleIdToken,
};
