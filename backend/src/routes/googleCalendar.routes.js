const express = require("express");
const { z } = require("zod");
const { requireAuth, requirePermission } = require("../middleware/auth");
const { hasPermission } = require("../lib/permissions");
const { deriveEventStatus } = require("../lib/eventStatus");
const prisma = require("../lib/prisma");
const googleCalendar = require("../services/googleCalendar");

const router = express.Router();

// Native deep links (captureakanksha://...) or http(s) pages the app runs at.
const RETURN_URL_PATTERN = /^[a-z][a-z0-9+.-]*:\/\/[^\s]+$/i;

const connectSchema = z.object({
  returnUrl: z.string().regex(RETURN_URL_PATTERN, "returnUrl must be an absolute URL."),
  /** "app": Google returns straight to returnUrl with the code (web). Default: via this server's /callback. */
  redirectMode: z.enum(["backend", "app"]).optional(),
});

const exchangeSchema = z.union([
  // Web: Google returned ?code=&state= to the app's own origin.
  z.object({ code: z.string().min(1), state: z.string().min(1) }),
  // Phone: the native Google Sign-In SDK produced a server auth code (no redirect URI involved).
  z.object({ serverAuthCode: z.string().min(1) }),
]);

const DAY_MS = 24 * 60 * 60 * 1000;

const importSchema = z.object({
  eventIds: z.array(z.string().min(1)).min(1).max(50),
  costCenterId: z.string().min(1),
  cityId: z.string().min(1).optional().nullable(),
});

/** Marks each Google event with the app event it was already imported as, if any. */
async function annotateImported(events) {
  const ids = events.map((event) => event.id);
  if (ids.length === 0) return events;
  const existing = await prisma.event.findMany({
    where: { googleEventId: { in: ids } },
    select: { id: true, googleEventId: true },
  });
  const byGoogleId = new Map(existing.map((row) => [row.googleEventId, row.id]));
  return events.map((event) => ({ ...event, importedEventId: byGoogleId.get(event.id) || null }));
}

/** Google gives a date (all-day) or an offset date-time; either way the first 10 chars are the local day. */
function localDay(value) {
  return value ? String(value).slice(0, 10) : null;
}

function shiftDay(day, days) {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function plainText(value) {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
}

/** Maps a Google event onto the fields POST /api/events expects for a kind "event". */
function toAppEvent(googleEvent) {
  const eventDate = localDay(googleEvent.start);
  if (!eventDate) return null;
  let endDate = localDay(googleEvent.end);
  // Google's all-day end date is exclusive (the day after the event ends).
  if (googleEvent.allDay && endDate) endDate = shiftDay(endDate, -1);
  if (!endDate || endDate <= eventDate) endDate = null;
  const title = String(googleEvent.title || "").trim().slice(0, 200) || "(No title)";
  const caption = plainText(googleEvent.description).slice(0, 500) || title;
  return {
    title,
    caption,
    eventDate,
    endDate,
    location: String(googleEvent.location || "").trim().slice(0, 300) || null,
  };
}

function withQuery(url, params) {
  const target = new URL(url);
  for (const [key, value] of Object.entries(params)) target.searchParams.set(key, value);
  return target.toString();
}

function handleServiceError(res, error, fallback) {
  if (error?.code === "calendar_not_configured") {
    return res.status(503).json({ message: error.message, code: error.code });
  }
  if (error?.code === "calendar_not_connected") {
    return res.status(404).json({ message: error.message, code: error.code });
  }
  if (error?.code === "calendar_disconnected") {
    return res.status(409).json({ message: error.message, code: error.code });
  }
  console.error("Google Calendar error:", error?.message || error);
  return res.status(500).json({ message: fallback });
}

/** Whether this user has linked a Google Calendar. */
router.get("/status", requireAuth, requirePermission("import_events"), async (req, res) => {
  const connection = await googleCalendar.getConnection(req.user.id);
  return res.json(googleCalendar.serializeConnection(connection));
});

/** Returns the Google consent URL; the app opens it in a browser session. */
router.post("/connect", requireAuth, requirePermission("import_events"), (req, res) => {
  const parsed = connectSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid connect payload." });
  }
  const redirectMode = parsed.data.redirectMode || "backend";
  if (redirectMode === "app" && !/^https?:\/\//i.test(parsed.data.returnUrl)) {
    return res.status(400).json({ message: "App-redirect mode needs an http(s) return URL." });
  }
  try {
    const url = googleCalendar.buildAuthUrl({
      req,
      userId: req.user.id,
      returnUrl: parsed.data.returnUrl,
      redirectMode,
      loginHint: req.user.email,
    });
    return res.json({ url, redirectMode });
  } catch (error) {
    return handleServiceError(res, error, "Could not start the Google Calendar connection.");
  }
});

/** Google redirects here after consent; no auth header, the signed state carries the user. */
router.get("/callback", async (req, res) => {
  let returnUrl = null;
  try {
    const state = googleCalendar.verifyState(req.query.state);
    returnUrl = state.returnUrl;
    if (req.query.error) {
      return res.redirect(withQuery(returnUrl, { calendar: "error", reason: String(req.query.error) }));
    }
    if (!req.query.code) {
      return res.redirect(withQuery(returnUrl, { calendar: "error", reason: "missing_code" }));
    }
    await googleCalendar.completeConnection({ redirectUri: state.redirectUri, code: String(req.query.code), userId: state.userId });
    return res.redirect(withQuery(returnUrl, { calendar: "connected" }));
  } catch (error) {
    console.error("Google Calendar callback error:", error?.message || error);
    if (returnUrl) {
      return res.redirect(withQuery(returnUrl, { calendar: "error", reason: String(error?.message || "unknown").slice(0, 200) }));
    }
    return res.status(400).send("Calendar connection failed. Please go back to the app and try again.");
  }
});

/**
 * Turns an authorization code into a stored connection.
 * Web: the app received ?code=&state= on its own origin. Phone: the native Google Sign-In SDK
 * returned a serverAuthCode, which Google exchanges with an empty redirect URI.
 */
router.post("/exchange", requireAuth, requirePermission("import_events"), async (req, res) => {
  const parsed = exchangeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Missing code." });
  }
  try {
    let code;
    let redirectUri;
    if ("serverAuthCode" in parsed.data) {
      code = parsed.data.serverAuthCode;
      redirectUri = "";
    } else {
      const state = googleCalendar.verifyState(parsed.data.state);
      if (state.userId !== req.user.id) {
        return res.status(403).json({ message: "This connection was started by a different user." });
      }
      code = parsed.data.code;
      redirectUri = state.redirectUri;
    }
    const connection = await googleCalendar.completeConnection({ redirectUri, code, userId: req.user.id });
    return res.json(googleCalendar.serializeConnection(connection));
  } catch (error) {
    if (/jwt|state/i.test(String(error?.message))) {
      return res.status(400).json({ message: "The connection attempt expired. Please try again." });
    }
    return handleServiceError(res, error, "Could not complete the Google Calendar connection.");
  }
});

/** Removes the stored tokens and revokes them at Google. */
router.delete("/", requireAuth, requirePermission("import_events"), async (req, res) => {
  try {
    await googleCalendar.removeConnection(req.user.id);
    return res.json({ connected: false });
  } catch (error) {
    return handleServiceError(res, error, "Could not disconnect Google Calendar.");
  }
});

/** Upcoming events from the connected calendar. Defaults to the next 60 days. */
router.get("/events", requireAuth, requirePermission("import_events"), async (req, res) => {
  const from = req.query.from ? new Date(String(req.query.from)) : new Date();
  const to = req.query.to ? new Date(String(req.query.to)) : new Date(from.getTime() + 60 * DAY_MS);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) {
    return res.status(400).json({ message: "Invalid date range." });
  }
  try {
    const result = await googleCalendar.listEvents({
      userId: req.user.id,
      timeMin: from,
      timeMax: to,
      maxResults: req.query.max,
    });
    const events = await annotateImported(result.events);
    return res.json({ ...result, events, from: from.toISOString(), to: to.toISOString() });
  } catch (error) {
    return handleServiceError(res, error, "Could not load events from Google Calendar.");
  }
});

/** Creates app events from selected Google events; ones already imported are skipped. */
router.post("/import", requireAuth, requirePermission("import_events"), async (req, res) => {
  const parsed = importSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Choose at least one event and a cost center." });
  }
  if (!hasPermission(req.user, "create_event")) {
    return res.status(403).json({ message: "Only Special Access and Super Admin users can create events." });
  }

  const costCenter = await prisma.costCenter.findUnique({ where: { id: parsed.data.costCenterId } });
  if (!costCenter) {
    return res.status(404).json({ message: "Selected cost center does not exist." });
  }
  const cityId = parsed.data.cityId || costCenter.cityId || null;
  if (!cityId) {
    return res.status(400).json({ message: "Selected cost center has no mapped city. Only Finance cost centers with a valid city are allowed." });
  }
  const city = await prisma.city.findUnique({ where: { id: cityId } });
  if (!city) {
    return res.status(404).json({ message: "Selected city does not exist." });
  }

  const eventIds = [...new Set(parsed.data.eventIds)];
  try {
    const alreadyImported = await prisma.event.findMany({
      where: { googleEventId: { in: eventIds } },
      select: { id: true, googleEventId: true },
    });
    const importedBefore = new Map(alreadyImported.map((row) => [row.googleEventId, row.id]));
    const toFetch = eventIds.filter((id) => !importedBefore.has(id));
    const googleEvents = await googleCalendar.getEventsByIds({ userId: req.user.id, eventIds: toFetch });
    const fetched = new Map(googleEvents.map((event) => [event.id, event]));

    const imported = [];
    const skipped = [];
    for (const googleId of eventIds) {
      if (importedBefore.has(googleId)) {
        skipped.push({ id: googleId, reason: "already_imported", eventId: importedBefore.get(googleId) });
        continue;
      }
      const googleEvent = fetched.get(googleId);
      if (!googleEvent || googleEvent.status === "cancelled") {
        skipped.push({ id: googleId, reason: "not_found" });
        continue;
      }
      const fields = toAppEvent(googleEvent);
      if (!fields) {
        skipped.push({ id: googleId, reason: "no_date" });
        continue;
      }
      try {
        const created = await prisma.event.create({
          data: {
            ...fields,
            kind: "event",
            googleEventId: googleId,
            // Events are published as soon as they are created; only posts and stories go through review.
            reviewStatus: "approved",
            approvedForGallery: true,
            reviewedAt: new Date(),
            costCenterId: costCenter.id,
            cityId,
            eventDate: new Date(`${fields.eventDate}T00:00:00.000Z`),
            endDate: fields.endDate ? new Date(`${fields.endDate}T00:00:00.000Z`) : null,
            eventStatus: deriveEventStatus({
              eventDate: `${fields.eventDate}T00:00:00.000Z`,
              endDate: fields.endDate ? `${fields.endDate}T00:00:00.000Z` : null,
            }),
            // Imported events start without a photo; one can be added from the app later.
            mediaType: "photo",
            mediaUrl: "",
            mediaDriveFileId: "",
            originalName: "",
            uploadedById: req.user.id,
            uploadedByName: req.user.name,
          },
          select: { id: true, title: true, eventDate: true },
        });
        imported.push({ id: googleId, eventId: created.id, title: created.title });
      } catch (error) {
        if (error?.code === "P2002") {
          skipped.push({ id: googleId, reason: "already_imported" });
          continue;
        }
        throw error;
      }
    }

    return res.status(imported.length > 0 ? 201 : 200).json({
      imported,
      skipped,
      importedCount: imported.length,
      skippedCount: skipped.length,
    });
  } catch (error) {
    return handleServiceError(res, error, "Could not import events from Google Calendar.");
  }
});

module.exports = router;
