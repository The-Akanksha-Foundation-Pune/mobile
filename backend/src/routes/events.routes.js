const express = require("express");
const multer = require("multer");
const { z } = require("zod");
const { requireAuth } = require("../middleware/auth");
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
  eventStatus: z.enum(["upcoming", "ongoing", "complete"]).optional(),
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
  posts: { select: { kind: true } },
};

function buildCityFilter(cityId) {
  const id = String(cityId);
  return {
    OR: [{ cityId: id }, { costCenter: { cityId: id } }],
  };
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
    eventStatus: item.eventStatus,
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
    reviewReason: item.reviewReason || null,
    reviewNote: item.reviewNote || null,
    reviewedAt: item.reviewedAt ? item.reviewedAt.toISOString() : null,
    kind: item.kind || "event",
    parentEventId: item.parentEventId || null,
    parentTitle: item.parentEvent?.title || null,
    body: item.body || null,
    postCount: (item.posts || []).filter((child) => child.kind === "post").length,
    storyCount: (item.posts || []).filter((child) => child.kind === "story").length,
  };
}

router.get("/", requireAuth, async (req, res) => {
  const { typeId, date, cityId, costCenterId, status, gallery, kind, parentEventId } = req.query;

  const where = {
    ...(kind ? { kind: String(kind) } : {}),
    ...(parentEventId ? { parentEventId: String(parentEventId) } : {}),
    ...(typeId ? { typeId: String(typeId) } : {}),
    ...(costCenterId ? { costCenterId: String(costCenterId) } : {}),
    ...(cityId && !costCenterId ? buildCityFilter(cityId) : {}),
    ...(status ? { eventStatus: String(status) } : {}),
    ...(gallery === "true"
      ? {
          approvedForGallery: true,
          eventStatus: "complete",
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

  const filtered = await prisma.event.findMany({
    where,
    include: eventInclude,
    orderBy: { createdAt: "desc" },
  });

  return res.json(filtered.map((item) => serializeEvent(item, req)));
});

router.get("/grouped", requireAuth, async (req, res) => {
  const allEvents = await prisma.event.findMany({
    include: { eventType: true, uploadedBy: true },
    orderBy: { createdAt: "desc" },
  });

  const grouped = {};
  for (const event of allEvents) {
    const typeName = event.eventType.name;
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
  const children = await prisma.event.findMany({
    where: { parentEventId: event.id },
    include: eventInclude,
    orderBy: { createdAt: "desc" },
  });
  return res.json({
    ...serializeEvent(event, req),
    posts: children.filter((child) => child.kind === "post").map((child) => serializeEvent(child, req)),
    stories: children.filter((child) => child.kind === "story").map((child) => serializeEvent(child, req)),
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
  }
  const kind = parsed.data.kind || (parent ? "post" : "event");
  const typeId = parsed.data.typeId || parent?.typeId;
  const eventDateRaw = parsed.data.eventDate || (parent ? parent.eventDate.toISOString().slice(0, 10) : null);
  const title = parsed.data.title?.trim() || null;
  if (!typeId) {
    return res.status(400).json({ message: "Select an event type." });
  }
  if (!eventDateRaw) {
    return res.status(400).json({ message: "Select an event date." });
  }
  if (kind !== "post" && !title) {
    return res.status(400).json({ message: "Add a title." });
  }

  const typeExists = await prisma.eventType.findUnique({ where: { id: typeId } });
  if (!typeExists) {
    return res.status(404).json({ message: "Selected event type does not exist." });
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

  let uploadedFile;
  try {
    uploadedFile = await uploadEventMedia({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype || "application/octet-stream",
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
      costCenterId: costCenter ? costCenter.id : parent?.costCenterId ?? null,
      eventDate: new Date(`${eventDateRaw}T00:00:00.000Z`),
      cityId: parsed.data.cityId || costCenter?.cityId || parent?.cityId || null,
      location: parsed.data.location?.trim() || parent?.location || null,
      eventStatus: parsed.data.eventStatus || parent?.eventStatus || "upcoming",
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
