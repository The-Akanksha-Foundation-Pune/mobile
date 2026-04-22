const express = require("express");
const multer = require("multer");
const { z } = require("zod");
const { requireAuth } = require("../middleware/auth");
const prisma = require("../lib/prisma");
const { uploadToGoogleDrive } = require("../services/drive");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

const createEventSchema = z.object({
  caption: z.string().min(1).max(500),
  typeId: z.string().min(1),
  eventDate: z.string().min(4),
  mediaType: z.enum(["photo", "video"]),
});

router.get("/", requireAuth, async (req, res) => {
  const { typeId, date } = req.query;

  const where = {
    ...(typeId ? { typeId: String(typeId) } : {}),
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
    include: { eventType: true },
    orderBy: { createdAt: "desc" },
  });

  return res.json(
    filtered.map((item) => ({
      id: item.id,
      caption: item.caption,
      typeId: item.typeId,
      eventDate: item.eventDate.toISOString().slice(0, 10),
      mediaType: item.mediaType,
      mediaUrl: item.mediaUrl,
      originalName: item.originalName,
      uploadedBy: item.uploadedById,
      createdAt: item.createdAt,
      eventTypeName: item.eventType.name,
    }))
  );
});

router.get("/grouped", requireAuth, async (_req, res) => {
  const allEvents = await prisma.event.findMany({
    include: { eventType: true },
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
      caption: event.caption,
      mediaType: event.mediaType,
      mediaUrl: event.mediaUrl,
      originalName: event.originalName,
      createdAt: event.createdAt,
    });
  }

  return res.json(grouped);
});

router.post("/", requireAuth, upload.single("media"), async (req, res) => {
  const parsed = createEventSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid event payload." });
  }

  if (!req.file) {
    return res.status(400).json({ message: "Media file is required." });
  }

  const typeExists = await prisma.eventType.findUnique({
    where: { id: parsed.data.typeId },
  });
  if (!typeExists) {
    return res.status(404).json({ message: "Selected event type does not exist." });
  }

  const uploadedFile = await uploadToGoogleDrive({
    buffer: req.file.buffer,
    originalName: req.file.originalname,
    mimeType: req.file.mimetype || "application/octet-stream",
  });

  const nextEvent = await prisma.event.create({
    data: {
      caption: parsed.data.caption.trim(),
      typeId: parsed.data.typeId,
      eventDate: new Date(`${parsed.data.eventDate}T00:00:00.000Z`),
      mediaType: parsed.data.mediaType,
      mediaUrl: uploadedFile.mediaUrl,
      mediaDriveFileId: uploadedFile.fileId,
      originalName: req.file.originalname,
      uploadedById: req.user.id,
    },
  });

  return res.status(201).json({
    id: nextEvent.id,
    caption: nextEvent.caption,
    typeId: nextEvent.typeId,
    eventDate: nextEvent.eventDate.toISOString().slice(0, 10),
    mediaType: nextEvent.mediaType,
    mediaUrl: nextEvent.mediaUrl,
    originalName: nextEvent.originalName,
    uploadedBy: nextEvent.uploadedById,
    createdAt: nextEvent.createdAt,
  });
});

module.exports = router;
