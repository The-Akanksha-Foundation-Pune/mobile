const express = require("express");
const multer = require("multer");
const { z } = require("zod");
const { requireAuth } = require("../middleware/auth");
const { hasPermission } = require("../lib/permissions");
const { optimizeImage } = require("../lib/optimizeImage");
const { deriveEventStatus, isLive } = require("../lib/eventStatus");
const { getLimits } = require("../lib/settings");
const prisma = require("../lib/prisma");
const { uploadEventMedia } = require("../services/mediaUpload");
const {
  isAllowedMediaMime,
  mimeMatchesDeclaredMediaType,
} = require("../lib/allowedMedia");
const { resolvePublicBaseUrl } = require("../lib/publicApiBase");
const { resolveMediaUrlForClient } = require("../lib/resolveMediaUrl");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (isAllowedMediaMime(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only common image and video formats are allowed."));
    }
  },
});

const CONTENT_KINDS = ["event", "post", "story"];

const createEventSchema = z.object({
  title: z.string().max(200).optional(),
  caption: z.string().min(1).max(500),
  typeId: z.string().min(1).optional(),
  eventDate: z.string().min(4).optional(),
  mediaType: z.enum(["photo", "video"]),
  costCenterId: z.string().min(1).optional(),
  cityId: z.string().min(1).optional(),
  location: z.string().max(300).optional(),
  endDate: z.string().min(4).optional(),
  kind: z.enum(CONTENT_KINDS).optional(),
  /** Posts and stories attach to an event and inherit its date, type and location. */
  parentEventId: z.string().min(1).optional(),
  body: z.string().max(20000).optional(),
}).refine((data) => data.costCenterId || data.cityId || data.parentEventId, {
  message: "Select a cost center, a city, or a parent event.",
});

const eventInclude = {
  eventType: true,
  uploadedBy: true,
  city: true,
  costCenter: { include: { city: true } },
  parentEvent: { select: { id: true, title: true } },
  posts: { select: { kind: true, reviewStatus: true } },
};

function buildCityFilter(cityId) {
  const id = String(cityId);
  return {
    OR: [{ cityId: id }, { costCenter: { cityId: id } }],
  };
}

function countChildren(item, kind) {
  const live = deriveEventStatus(item) === "ongoing";
  return (item.posts || []).filter((child) => child.kind === kind && (live || child.reviewStatus === "approved")).length;
}

function serializeEvent(item, req) {
  const cityName = item.city?.name || item.costCenter?.city?.name || "";
  return {
    id: item.id,
    title: item.title || "",
    caption: item.caption,
    typeId: item.typeId,
    eventTypeName: item.eventType?.name || "",
    eventDate: item.eventDate.toISOString().slice(0, 10),
    location: item.location || "",
    eventStatus: deriveEventStatus(item),
    endDate: item.endDate ? item.endDate.toISOString().slice(0, 10) : null,
    approvedForGallery: item.approvedForGallery,
    costCenterId: item.costCenterId,
    costCenterCode: item.costCenter?.code || "",
    costCenterName: item.costCenter?.name || "",
    cityId: item.cityId || item.costCenter?.cityId || null,
    cityName,
    mediaType: item.mediaType,
    mediaUrl: resolveMediaUrlForClient(req, item.mediaUrl),
    originalName: item.originalName,
    uploadedBy: item.uploadedById,
    uploadedByName: item.uploadedByName || item.uploadedBy?.name,
    uploadedByEmail: item.uploadedBy?.email,
    createdAt: item.createdAt,
    reviewStatus: item.reviewStatus,
    reviewedAt: item.reviewedAt ? item.reviewedAt.toISOString() : null,
    reviewedById: item.reviewedById || null,
    reviewedByName: item.reviewer?.name || null,
    reviewedByRole: item.reviewer?.role || null,
    kind: item.kind || "event",
    parentEventId: item.parentEventId || null,
    parentTitle: item.parentEvent?.title || null,
    body: item.body || null,
    // While an event is live, counts include what has been submitted so far; afterwards only approved items count.
    postCount: countChildren(item, "post"),
    storyCount: countChildren(item, "story"),
  };
}

/** Looks up who reviewed each row so clients can say "approved by <name>". */
async function attachReviewers(rows) {
  const ids = [...new Set(rows.map((row) => row.reviewedById).filter(Boolean))];
  if (ids.length === 0) return rows;
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, role: true } });
  const byId = new Map(users.map((user) => [user.id, user]));
  return rows.map((row) => ({ ...row, reviewer: row.reviewedById ? byId.get(row.reviewedById) : undefined }));
}

router.get("/", requireAuth, async (req, res) => {
  const { typeId, date, cityId, costCenterId, status, gallery, kind, parentEventId } = req.query;

  const where = {
    ...(kind ? { kind: String(kind) } : {}),
    ...(parentEventId ? { parentEventId: String(parentEventId) } : {}),
    ...(typeId ? { typeId: String(typeId) } : {}),
    ...(costCenterId ? { costCenterId: String(costCenterId) } : {}),
    ...(cityId && !costCenterId ? buildCityFilter(cityId) : {}),
    ...(gallery === "true"
      ? {
          approvedForGallery: true,
          ...(cityId && !costCenterId ? buildCityFilter(cityId) : {}),
        }
      : {}),
    ...(date
      ? {
          eventDate: {
            gte: new Date(`${String(date)}T00:00:00.000Z`),
            lt: new Date(`${String(date)}T23:59:59.999Z`),
          },
        }
      : {}),
  };

  // Only reviewers see unapproved posts and stories by other people.
  const reviewer = hasPermission(req.user, "approve_post");
  const visibility = reviewer
    ? {}
    : { OR: [{ kind: "event" }, { reviewStatus: "approved" }, { uploadedById: req.user.id }] };

  const rows = await prisma.event.findMany({
    where: { AND: [where, visibility] },
    include: eventInclude,
    orderBy: { createdAt: "desc" },
  });
  const filtered = status ? rows.filter((item) => deriveEventStatus(item) === String(status)) : rows;

  return res.json((await attachReviewers(filtered)).map((item) => serializeEvent(item, req)));
});

router.get("/grouped", requireAuth, async (req, res) => {
  const allEvents = await prisma.event.findMany({
    include: { eventType: true, uploadedBy: true },
    orderBy: { createdAt: "desc" },
  });

  const grouped = {};
  for (const event of allEvents) {
    const typeName = event.eventType?.name || "Uncategorised";
    const dateKey = event.eventDate.toISOString().slice(0, 10);
    if (!grouped[typeName]) {
      grouped[typeName] = {};
    }
    if (!grouped[typeName][dateKey]) {
      grouped[typeName][dateKey] = [];
    }
    grouped[typeName][dateKey].push({
      id: event.id,
      title: event.title || "",
      caption: event.caption,
      mediaType: event.mediaType,
      mediaUrl: resolveMediaUrlForClient(req, event.mediaUrl),
      originalName: event.originalName,
      uploadedBy: event.uploadedById,
      uploadedByName: event.uploadedByName || event.uploadedBy.name,
      uploadedByEmail: event.uploadedBy.email,
      createdAt: event.createdAt,
    });
  }

  return res.json(grouped);
});

/** One event with the posts and stories attached to it. */
router.get("/:id", requireAuth, async (req, res) => {
  const event = await prisma.event.findUnique({ where: { id: req.params.id }, include: eventInclude });
  if (!event) {
    return res.status(404).json({ message: "Event not found." });
  }
  // While an event is live the page shows everything submitted so far; afterwards only approved items remain.
  const children = await prisma.event.findMany({
    where: { parentEventId: event.id, ...(isLive(event) ? {} : { reviewStatus: "approved" }) },
    include: eventInclude,
    orderBy: { createdAt: "desc" },
  });
  const [limits, mine] = await Promise.all([
    getLimits(),
    prisma.event.groupBy({ by: ["kind"], where: { parentEventId: event.id, uploadedById: req.user.id }, _count: { _all: true } }),
  ]);
  const myCounts = { posts: 0, stories: 0 };
  for (const row of mine) {
    if (row.kind === "post") myCounts.posts = row._count._all;
    if (row.kind === "story") myCounts.stories = row._count._all;
  }
  const unlimited = req.user.role === "super_admin";
  return res.json({
    ...serializeEvent(event, req),
    posts: children.filter((child) => child.kind === "post").map((child) => serializeEvent(child, req)),
    stories: children.filter((child) => child.kind === "story").map((child) => serializeEvent(child, req)),
    limits,
    myCounts,
    remaining: unlimited
      ? { posts: null, stories: null }
      : { posts: Math.max(0, limits.posts - myCounts.posts), stories: Math.max(0, limits.stories - myCounts.stories) },
  });
});

router.post("/", requireAuth, (req, res, next) => {
  upload.single("media")(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({ message: "File too large." });
        }
        return res.status(400).json({ message: err.message || "Upload rejected." });
      }
      return res.status(400).json({
        message: err.message || "Upload rejected.",
      });
    }
    next();
  });
}, async (req, res) => {
  const parsed = createEventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid event payload." });
  }

  if (!req.file) {
    return res.status(400).json({ message: "Media file is required." });
  }

  if (!mimeMatchesDeclaredMediaType(parsed.data.mediaType, req.file.mimetype)) {
    return res.status(400).json({
      message:
        parsed.data.mediaType === "photo"
          ? "Photo events require an image file."
          : "Video events require a video file.",
    });
  }

  let parent = null;
  if (parsed.data.parentEventId) {
    parent = await prisma.event.findUnique({ where: { id: parsed.data.parentEventId } });
    if (!parent || parent.kind !== "event") {
      return res.status(404).json({ message: "Parent event not found." });
    }
    if (!isLive(parent)) {
      return res.status(400).json({
        message:
          deriveEventStatus(parent) === "upcoming"
            ? "This event hasn't started yet. Posts and stories open on the event day."
            : "This event has ended, so posts and stories are closed.",
      });
    }
  }
  const kind = parsed.data.kind || (parent ? "post" : "event");
  if (kind !== "event" && !parent) {
    return res.status(400).json({ message: `Choose the event this ${kind} belongs to.` });
  }
  if (kind !== "event" && req.user.role !== "super_admin") {
    const limits = await getLimits();
    const limit = kind === "story" ? limits.stories : limits.posts;
    const used = await prisma.event.count({ where: { parentEventId: parent.id, uploadedById: req.user.id, kind } });
    if (used >= limit) {
      return res.status(400).json({
        message: `You've reached the limit of ${limit} ${kind === "story" ? (limit === 1 ? "story" : "stories") : limit === 1 ? "post" : "posts"} for this event.`,
      });
    }
  }
  const neededPermission = kind === "event" ? "create_event" : kind === "story" ? "add_story" : "add_post";
  if (!hasPermission(req.user, neededPermission)) {
    return res.status(403).json({
      message:
        kind === "event"
          ? "Only Special Access and Super Admin users can create events. Add a post or story to an existing event instead."
          : "You don't have access to do this.",
    });
  }
  const typeId = parsed.data.typeId || parent?.typeId || null;
  const eventDateRaw = parsed.data.eventDate || (parent ? parent.eventDate.toISOString().slice(0, 10) : null);
  const endDateRaw = parsed.data.endDate || (parent?.endDate ? parent.endDate.toISOString().slice(0, 10) : null);
  if (endDateRaw && eventDateRaw && endDateRaw < eventDateRaw) {
    return res.status(400).json({ message: "The end date can't be before the start date." });
  }
  const title = parsed.data.title?.trim() || null;
  if (!eventDateRaw) {
    return res.status(400).json({ message: "Select an event date." });
  }
  if (kind !== "post" && !title) {
    return res.status(400).json({ message: "Add a title." });
  }

  if (typeId) {
    const typeExists = await prisma.eventType.findUnique({ where: { id: typeId } });
    if (!typeExists) {
      return res.status(404).json({ message: "Selected event type does not exist." });
    }
  }

  let costCenter = null;
  if (parsed.data.costCenterId) {
    costCenter = await prisma.costCenter.findUnique({
      where: { id: parsed.data.costCenterId },
    });
    if (!costCenter) {
      return res.status(404).json({ message: "Selected cost center does not exist." });
    }
    if (!costCenter.cityId && !parsed.data.cityId) {
      return res.status(400).json({
        message: "Selected cost center has no mapped city. Only Finance cost centers with a valid city are allowed.",
      });
    }
  }

  if (parsed.data.cityId) {
    const city = await prisma.city.findUnique({ where: { id: parsed.data.cityId } });
    if (!city) {
      return res.status(404).json({ message: "Selected city does not exist." });
    }
  }

  const publicBase = resolvePublicBaseUrl(req);

  const media = await optimizeImage({
    buffer: req.file.buffer,
    mimeType: req.file.mimetype || "application/octet-stream",
    originalName: req.file.originalname,
  });

  let uploadedFile;
  try {
    uploadedFile = await uploadEventMedia({
      buffer: media.buffer,
      originalName: media.originalName,
      mimeType: media.mimeType,
      publicBaseUrl: publicBase,
    });
  } catch (err) {
    if (err.code === "DRIVE_NOT_CONFIGURED") {
      return res.status(503).json({
        message:
          "Google Drive is not configured. Set MEDIA_STORAGE=local for disk-only uploads, or configure GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, and GOOGLE_DRIVE_FOLDER_ID.",
      });
    }
    throw err;
  }

  const nextEvent = await prisma.event.create({
    data: {
      title,
      caption: parsed.data.caption.trim(),
      typeId,
      kind,
      parentEventId: parent ? parent.id : null,
      body: parsed.data.body?.trim() || null,
      // Events are published as soon as they are created; only posts and stories go through review.
      ...(kind === "event" ? { reviewStatus: "approved", approvedForGallery: true, reviewedAt: new Date() } : {}),
      costCenterId: costCenter ? costCenter.id : parent?.costCenterId ?? null,
      eventDate: new Date(`${eventDateRaw}T00:00:00.000Z`),
      endDate: endDateRaw ? new Date(`${endDateRaw}T00:00:00.000Z`) : null,
      cityId: parsed.data.cityId || costCenter?.cityId || parent?.cityId || null,
      location: parsed.data.location?.trim() || parent?.location || null,
      eventStatus: deriveEventStatus({ eventDate: `${eventDateRaw}T00:00:00.000Z`, endDate: endDateRaw ? `${endDateRaw}T00:00:00.000Z` : null }),
      mediaType: parsed.data.mediaType,
      mediaUrl: uploadedFile.mediaUrl,
      mediaDriveFileId: uploadedFile.fileId,
      originalName: req.file.originalname,
      uploadedById: req.user.id,
      uploadedByName: req.user.name,
    },
    include: eventInclude,
  });

  return res.status(201).json(serializeEvent(nextEvent, req));
});

module.exports = router;
