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

const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  caption: z.string().min(1).max(500),
  typeId: z.string().min(1),
  eventDate: z.string().min(4),
  mediaType: z.enum(["photo", "video"]),
  costCenterId: z.string().min(1),
  cityId: z.string().min(1).optional(),
  location: z.string().max(300).optional(),
  eventStatus: z.enum(["upcoming", "ongoing", "complete"]).optional(),
});

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
  };
}

router.get("/", requireAuth, async (req, res) => {
  const { typeId, date, cityId, costCenterId, status, gallery } = req.query;

  const where = {
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
    include: {
      eventType: true,
      uploadedBy: true,
      city: true,
      costCenter: { include: { city: true } },
    },
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

  const typeExists = await prisma.eventType.findUnique({
    where: { id: parsed.data.typeId },
  });
  if (!typeExists) {
    return res.status(404).json({ message: "Selected event type does not exist." });
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

  const costCenter = await prisma.costCenter.findUnique({
    where: { id: parsed.data.costCenterId },
  });
  if (!costCenter) {
    return res.status(404).json({ message: "Selected cost center does not exist." });
  }
  if (!costCenter.cityId) {
    return res.status(400).json({
      message: "Selected cost center has no mapped city. Only Finance cost centers with a valid city are allowed.",
    });
  }

  if (parsed.data.cityId) {
    const city = await prisma.city.findUnique({ where: { id: parsed.data.cityId } });
    if (!city) {
      return res.status(404).json({ message: "Selected city does not exist." });
    }
  }

  const nextEvent = await prisma.event.create({
    data: {
      title: parsed.data.title.trim(),
      caption: parsed.data.caption.trim(),
      typeId: parsed.data.typeId,
      costCenterId: parsed.data.costCenterId,
      eventDate: new Date(`${parsed.data.eventDate}T00:00:00.000Z`),
      cityId: parsed.data.cityId || costCenter.cityId || null,
      location: parsed.data.location?.trim() || null,
      eventStatus: parsed.data.eventStatus || "upcoming",
      mediaType: parsed.data.mediaType,
      mediaUrl: uploadedFile.mediaUrl,
      mediaDriveFileId: uploadedFile.fileId,
      originalName: req.file.originalname,
      uploadedById: req.user.id,
      uploadedByName: req.user.name,
    },
    include: {
      eventType: true,
      city: true,
      costCenter: { include: { city: true } },
      uploadedBy: true,
    },
  });

  return res.status(201).json(serializeEvent(nextEvent, req));
});

module.exports = router;
