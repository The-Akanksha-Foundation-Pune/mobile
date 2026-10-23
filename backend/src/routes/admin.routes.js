const express = require("express");
const { z } = require("zod");
const { requireAuth, requirePermission } = require("../middleware/auth");
const { resolveMediaUrlForClient } = require("../lib/resolveMediaUrl");
const prisma = require("../lib/prisma");
const { deriveEventStatus } = require("../lib/eventStatus");

const router = express.Router();

const eventModerationSchema = z.object({
  approvedForGallery: z.boolean().optional(),
  costCenterId: z.string().min(1).optional(),
  cityId: z.string().min(1).nullable().optional(),
  location: z.string().max(300).nullable().optional(),
  title: z.string().max(200).optional(),
  caption: z.string().max(500).optional(),
  eventDate: z.string().min(4).optional(),
  typeId: z.string().min(1).optional(),
});

const REVIEW_STATUSES = ["pending", "approved"];

const reviewSchema = z.object({
  status: z.enum(REVIEW_STATUSES),
});

const bulkReviewSchema = z.object({
  eventIds: z.array(z.string().min(1)).min(1).max(100),
  status: z.enum(REVIEW_STATUSES),
});

const eventInclude = {
  eventType: true,
  uploadedBy: true,
  city: true,
  costCenter: { include: { city: true } },
  parentEvent: { select: { id: true, title: true, eventDate: true, endDate: true } },
};

/** Fields written for a review decision. approvedForGallery stays in sync for older clients. */
function reviewData({ status }, reviewerId) {
  return {
    reviewStatus: status,
    approvedForGallery: status === "approved",
    reviewedById: reviewerId,
    reviewedAt: new Date(),
  };
}

function serializeEvent(item, req) {
  const cityName = item.city?.name || item.costCenter?.city?.name || "";
  return {
    id: item.id,
    title: item.title || "",
    caption: item.caption,
    typeId: item.typeId,
    eventDate: item.eventDate.toISOString().slice(0, 10),
    location: item.location || "",
    // Posts and stories follow their event's dates; older ones have no endDate of their own.
    eventStatus: deriveEventStatus(item.parentEvent || item),
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
    eventTypeName: item.eventType?.name || "",
    uploadedByRole: item.uploadedBy?.role || "",
    reviewStatus: item.reviewStatus,
    reviewedAt: item.reviewedAt ? item.reviewedAt.toISOString() : null,
    kind: item.kind || "event",
    parentEventId: item.parentEventId || null,
    parentTitle: item.parentEvent?.title || null,
    body: item.body || null,
  };
}

router.use(requireAuth, requirePermission("approve_post"));

router.get("/events", async (req, res) => {
  const events = await prisma.event.findMany({
    include: eventInclude,
    orderBy: { createdAt: "desc" },
  });
  return res.json(events.map((item) => serializeEvent(item, req)));
});

router.patch("/events/:id", async (req, res) => {
  const parsed = eventModerationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid moderation payload." });
  }

  const existing = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ message: "Event not found." });
  }

  if (parsed.data.costCenterId) {
    const center = await prisma.costCenter.findUnique({ where: { id: parsed.data.costCenterId } });
    if (!center) {
      return res.status(404).json({ message: "Cost center not found." });
    }
  }

  if (parsed.data.cityId) {
    const city = await prisma.city.findUnique({ where: { id: parsed.data.cityId } });
    if (!city) {
      return res.status(404).json({ message: "City not found." });
    }
  }

  if (parsed.data.typeId) {
    const typeExists = await prisma.eventType.findUnique({ where: { id: parsed.data.typeId } });
    if (!typeExists) {
      return res.status(404).json({ message: "Event type not found." });
    }
  }

  const updated = await prisma.event.update({
    where: { id: req.params.id },
    data: {
      ...(parsed.data.approvedForGallery !== undefined
        ? {
            approvedForGallery: parsed.data.approvedForGallery,
            reviewStatus: parsed.data.approvedForGallery
              ? "approved"
              : existing.reviewStatus === "approved"
                ? "pending"
                : existing.reviewStatus,
          }
        : {}),
      ...(parsed.data.costCenterId !== undefined ? { costCenterId: parsed.data.costCenterId } : {}),
      ...(parsed.data.cityId !== undefined ? { cityId: parsed.data.cityId } : {}),
      ...(parsed.data.location !== undefined ? { location: parsed.data.location?.trim() || null } : {}),
      ...(parsed.data.title !== undefined ? { title: parsed.data.title.trim() } : {}),
      ...(parsed.data.caption !== undefined ? { caption: parsed.data.caption.trim() } : {}),
      ...(parsed.data.eventDate !== undefined
        ? { eventDate: new Date(`${parsed.data.eventDate}T00:00:00.000Z`) }
        : {}),
      ...(parsed.data.typeId !== undefined ? { typeId: parsed.data.typeId } : {}),
    },
    include: eventInclude,
  });

  return res.json(serializeEvent(updated, req));
});

router.patch("/events/:id/review", async (req, res) => {
  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid review payload." });
  }
  const existing = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ message: "Event not found." });
  }
  const updated = await prisma.event.update({
    where: { id: req.params.id },
    data: reviewData(parsed.data, req.user.id),
    include: eventInclude,
  });
  return res.json(serializeEvent(updated, req));
});

router.post("/events/bulk-review", async (req, res) => {
  const parsed = bulkReviewSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid bulk review payload." });
  }
  const result = await prisma.event.updateMany({
    where: { id: { in: parsed.data.eventIds } },
    data: reviewData({ status: parsed.data.status }, req.user.id),
  });
  return res.json({ updated: result.count });
});

router.post("/events/:id/notify-donors", async (req, res) => {
  const event = await prisma.event.findUnique({
    where: { id: req.params.id },
    include: {
      eventType: true,
      costCenter: { include: { donors: { where: { isActive: true } } } },
    },
  });
  if (!event) {
    return res.status(404).json({ message: "Event not found." });
  }

  if (!event.costCenterId || !event.costCenter) {
    return res.status(400).json({ message: "Event has no cost center. Cannot notify donors." });
  }

  const donors = event.costCenter.donors;
  if (donors.length === 0) {
    return res.status(400).json({ message: "No active donors for this cost center." });
  }

  const subject = `Update: ${event.title || "Akanksha event"} (${event.costCenter.code})`;
  const message = `${event.title || "Event"}\n${event.caption}\nDate: ${event.eventDate.toISOString().slice(0, 10)}\nType: ${event.eventType?.name || "Event"}`;

  const rows = await prisma.$transaction(
    donors.map((donor) =>
      prisma.donorNotification.create({
        data: {
          donorId: donor.id,
          costCenterId: event.costCenterId,
          eventId: event.id,
          subject,
          message,
        },
      })
    )
  );

  return res.status(201).json({
    ok: true,
    notifiedCount: rows.length,
    costCenterName: event.costCenter.name,
  });
});

module.exports = router;
