const { google } = require("googleapis");
const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");

const CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

const STATE_PURPOSE = "google-calendar-connect";

function getClientId() {
  return process.env.GOOGLE_WEB_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "";
}

function getClientSecret() {
  return process.env.GOOGLE_CLIENT_SECRET || "";
}

/**
 * Where Google sends the user back after consent. Must be listed under
 * "Authorised redirect URIs" on the web OAuth client in Google Cloud Console.
 */
function getRedirectUri(req) {
  if (process.env.GOOGLE_CALENDAR_REDIRECT_URI) return process.env.GOOGLE_CALENDAR_REDIRECT_URI;
  const proto = req.get("x-forwarded-proto") || req.protocol;
  const host = req.get("x-forwarded-host") || req.get("host");
  return `${proto}://${host}/api/calendar/google/callback`;
}

function assertConfigured() {
  if (!getClientId() || !getClientSecret()) {
    const error = new Error("Google Calendar is not configured on the server (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).");
    error.code = "calendar_not_configured";
    throw error;
  }
}

function createOAuthClient(redirectUri) {
  return new google.auth.OAuth2(getClientId(), getClientSecret(), redirectUri);
}

/** Signed, short-lived state so the callback can trust the user id, return URL and redirect URI. */
function signState({ userId, returnUrl, redirectUri }) {
  return jwt.sign({ sub: userId, returnUrl, redirectUri, purpose: STATE_PURPOSE }, process.env.JWT_SECRET || "dev-secret", {
    expiresIn: "15m",
  });
}

function verifyState(state) {
  const decoded = jwt.verify(String(state || ""), process.env.JWT_SECRET || "dev-secret");
  if (decoded.purpose !== STATE_PURPOSE || !decoded.sub) {
    throw new Error("Invalid calendar connect state.");
  }
  return { userId: decoded.sub, returnUrl: decoded.returnUrl, redirectUri: decoded.redirectUri };
}

/**
 * Two ways back from Google:
 * - "backend": Google redirects to this server's /callback, which stores the tokens and then
 *   sends the browser on to returnUrl (needed on phones, where returnUrl is a deep link).
 * - "app": Google redirects straight to returnUrl (the web app's origin, already registered for
 *   sign-in) with ?code=...; the app posts that code to /exchange. No extra Console entry needed.
 */
function buildAuthUrl({ req, userId, returnUrl, redirectMode = "backend", loginHint }) {
  assertConfigured();
  const redirectUri = redirectMode === "app" ? returnUrl : getRedirectUri(req);
  const client = createOAuthClient(redirectUri);
  return client.generateAuthUrl({
    access_type: "offline",
    // select_account: the browser may be signed in to a personal Gmail, so always show the chooser.
    // consent: forces Google to issue a refresh token even when the user consented before.
    prompt: "select_account consent",
    include_granted_scopes: true,
    scope: CALENDAR_SCOPES,
    // Pre-selects the user's work account in the chooser.
    ...(loginHint ? { login_hint: loginHint } : {}),
    state: signState({ userId, returnUrl, redirectUri }),
  });
}

/** Exchanges the consent code for tokens and stores them against the user. */
async function completeConnection({ redirectUri, code, userId }) {
  assertConfigured();
  const client = createOAuthClient(redirectUri);
  const { tokens } = await client.getToken(code);
  if (!tokens.refresh_token) {
    // Happens when Google skips consent; "prompt=consent" above should prevent it.
    const existing = await prisma.googleCalendarConnection.findUnique({ where: { userId } });
    if (!existing?.refreshToken) {
      throw new Error("Google did not return a refresh token. Remove the app's access in your Google Account and try again.");
    }
    tokens.refresh_token = existing.refreshToken;
  }
  client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const { data: info } = await oauth2.userinfo.get();
  const googleEmail = String(info.email || "").toLowerCase();

  const data = {
    googleEmail,
    accessToken: tokens.access_token || "",
    refreshToken: tokens.refresh_token,
    scope: tokens.scope || null,
    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
  };
  return prisma.googleCalendarConnection.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
}

function serializeConnection(connection) {
  if (!connection) return { connected: false };
  return {
    connected: true,
    email: connection.googleEmail,
    connectedAt: connection.createdAt.toISOString(),
  };
}

async function getConnection(userId) {
  return prisma.googleCalendarConnection.findUnique({ where: { userId } });
}

async function removeConnection(userId) {
  const connection = await getConnection(userId);
  if (!connection) return false;
  try {
    const client = createOAuthClient();
    await client.revokeToken(connection.refreshToken);
  } catch (_error) {
    // Google may already have revoked it; the local record is removed either way.
  }
  await prisma.googleCalendarConnection.delete({ where: { userId } });
  return true;
}

/** Returns an OAuth client for the user, refreshing the access token when needed. */
async function getAuthorizedClient(userId) {
  assertConfigured();
  const connection = await getConnection(userId);
  if (!connection) {
    const error = new Error("Google Calendar is not connected.");
    error.code = "calendar_not_connected";
    throw error;
  }
  const client = createOAuthClient();
  client.setCredentials({
    access_token: connection.accessToken,
    refresh_token: connection.refreshToken,
    expiry_date: connection.expiresAt ? connection.expiresAt.getTime() : undefined,
  });
  client.on("tokens", (tokens) => {
    void prisma.googleCalendarConnection
      .update({
        where: { userId },
        data: {
          ...(tokens.access_token ? { accessToken: tokens.access_token } : {}),
          ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
          ...(tokens.expiry_date ? { expiresAt: new Date(tokens.expiry_date) } : {}),
        },
      })
      .catch(() => {});
  });
  return { client, connection };
}

function isRevokedError(error) {
  const message = String(error?.response?.data?.error || error?.message || "");
  return /invalid_grant|invalid_token|unauthorized_client/i.test(message) || error?.response?.status === 401;
}

function serializeEvent(item, calendarName) {
  const allDay = Boolean(item.start?.date && !item.start?.dateTime);
  return {
    id: item.id,
    title: item.summary || "(No title)",
    description: item.description || "",
    location: item.location || "",
    allDay,
    start: item.start?.dateTime || item.start?.date || null,
    end: item.end?.dateTime || item.end?.date || null,
    timeZone: item.start?.timeZone || null,
    status: item.status || "confirmed",
    htmlLink: item.htmlLink || "",
    organizer: item.organizer?.displayName || item.organizer?.email || "",
    attendeeCount: Array.isArray(item.attendees) ? item.attendees.length : 0,
    calendarName,
  };
}

/** Lists upcoming events from the user's primary calendar. */
async function listEvents({ userId, timeMin, timeMax, maxResults = 50 }) {
  const { client, connection } = await getAuthorizedClient(userId);
  const calendar = google.calendar({ version: "v3", auth: client });
  try {
    const { data } = await calendar.events.list({
      calendarId: "primary",
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: Math.min(Math.max(Number(maxResults) || 50, 1), 250),
      showDeleted: false,
    });
    const calendarName = data.summary || connection.googleEmail;
    const items = (data.items || []).filter((item) => item.status !== "cancelled");
    return {
      calendarName,
      timeZone: data.timeZone || null,
      events: items.map((item) => serializeEvent(item, calendarName)),
    };
  } catch (error) {
    if (isRevokedError(error)) {
      await prisma.googleCalendarConnection.delete({ where: { userId } }).catch(() => {});
      const revoked = new Error("Your Google Calendar connection has expired. Please connect it again.");
      revoked.code = "calendar_disconnected";
      throw revoked;
    }
    throw error;
  }
}

/** Fetches specific events by id from the user's primary calendar (missing ones are skipped). */
async function getEventsByIds({ userId, eventIds }) {
  const { client, connection } = await getAuthorizedClient(userId);
  const calendar = google.calendar({ version: "v3", auth: client });
  const results = [];
  try {
    for (const eventId of eventIds) {
      try {
        const { data } = await calendar.events.get({ calendarId: "primary", eventId });
        results.push(serializeEvent(data, connection.googleEmail));
      } catch (error) {
        if (error?.response?.status === 404 || error?.code === 404) continue;
        throw error;
      }
    }
    return results;
  } catch (error) {
    if (isRevokedError(error)) {
      await prisma.googleCalendarConnection.delete({ where: { userId } }).catch(() => {});
      const revoked = new Error("Your Google Calendar connection has expired. Please connect it again.");
      revoked.code = "calendar_disconnected";
      throw revoked;
    }
    throw error;
  }
}

module.exports = {
  CALENDAR_SCOPES,
  getEventsByIds,
  buildAuthUrl,
  verifyState,
  completeConnection,
  getConnection,
  removeConnection,
  serializeConnection,
  listEvents,
};
