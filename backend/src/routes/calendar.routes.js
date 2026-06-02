const express = require("express");
const { z } = require("zod");
const { requireAuth, requireRole } = require("../middleware/auth");
const prisma = require("../lib/prisma");

const router = express.Router();

const entrySchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  eventDate: z.string().min(4),
  endDate: z.string().min(4).optional().nullable(),
  location: z.string().max(300).optional().nullable(),
  costCenterId: z.string().min(1),
  cityId: z.string().min(1).optional().nullable(),
  isPublished: z.boolean().optional(),
});

function monthRange(month) {
  const [year, monthNum] = String(month).split("-").map(Number);
  if (!year || !monthNum || monthNum < 1 || monthNum > 12) {
    return null;
  }
  const start = new Date(Date.UTC(year, monthNum - 1, 1));
  const end = new Date(Date.UTC(year, monthNum, 1));
  return { start, end };
}

function serializeEntry(entry) {
  return {
    id: entry.id,
    title: entry.title,
    description: entry.description || "",
    eventDate: entry.eventDate.toISOString().slice(0, 10),
    endDate: entry.endDate ? entry.endDate.toISOString().slice(0, 10) : null,
    location: entry.location || "",
    costCenterId: entry.costCenterId,
    costCenterName: entry.costCenter?.name || "",
    costCenterCode: entry.costCenter?.code || "",
    cityId: entry.cityId,
    cityName: entry.city?.name || "",
    isPublished: entry.isPublished,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };
}

router.get("/", requireAuth, async (req, res) => {
  const { costCenterId, cityId, month } = req.query;
  if (!costCenterId) {
    return res.status(400).json({ message: "costCenterId is required." });
  }

  const range = month ? monthRange(month) : null;
  const where = {
    costCenterId: String(costCenterId),
    ...(cityId ? { cityId: String(cityId) } : {}),
    ...(req.user.role === "admin" ? {} : { isPublished: true }),
    ...(range
      ? {
          eventDate: {
            gte: range.start,
            lt: range.end,
          },
        }
      : {}),
  };

  const entries = await prisma.calendarEntry.findMany({
    where,
    include: { city: true, costCenter: true },
    orderBy: { eventDate: "asc" },
  });

  return res.json(entries.map(serializeEntry));
});

router.get("/all", requireAuth, requireRole("admin"), async (req, res) => {
  const { costCenterId, cityId } = req.query;
  const entries = await prisma.calendarEntry.findMany({
    where: {
      ...(costCenterId ? { costCenterId: String(costCenterId) } : {}),
      ...(cityId ? { cityId: String(cityId) } : {}),
    },
    include: { city: true, costCenter: true },
    orderBy: { eventDate: "desc" },
  });
  return res.json(entries.map(serializeEntry));
});

router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  const parsed = entrySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid calendar entry payload." });
  }

  const costCenter = await prisma.costCenter.findUnique({
    where: { id: parsed.data.costCenterId },
  });
  if (!costCenter) {
    return res.status(404).json({ message: "Cost center not found." });
  }

  if (parsed.data.cityId) {
    const city = await prisma.city.findUnique({ where: { id: parsed.data.cityId } });
    if (!city) {
      return res.status(404).json({ message: "City not found." });
    }
  }

  const entry = await prisma.calendarEntry.create({
    data: {
      title: parsed.data.title.trim(),
      description: parsed.data.description?.trim() || null,
      eventDate: new Date(`${parsed.data.eventDate}T00:00:00.000Z`),
      endDate: parsed.data.endDate ? new Date(`${parsed.data.endDate}T00:00:00.000Z`) : null,
      location: parsed.data.location?.trim() || null,
      costCenterId: parsed.data.costCenterId,
      cityId: parsed.data.cityId || costCenter.cityId || null,
      isPublished: parsed.data.isPublished ?? true,
    },
    include: { city: true, costCenter: true },
  });

  return res.status(201).json(serializeEntry(entry));
});

router.patch("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const parsed = entrySchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid calendar entry update." });
  }

  const existing = await prisma.calendarEntry.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ message: "Calendar entry not found." });
  }

  if (parsed.data.costCenterId !== undefined) {
    const costCenter = await prisma.costCenter.findUnique({
      where: { id: parsed.data.costCenterId },
    });
    if (!costCenter) {
      return res.status(404).json({ message: "Cost center not found." });
    }
  }

  if (parsed.data.cityId) {
    const city = await prisma.city.findUnique({ where: { id: parsed.data.cityId } });
    if (!city) {
      return res.status(404).json({ message: "City not found." });
    }
  }

  const entry = await prisma.calendarEntry.update({
    where: { id: req.params.id },
    data: {
      ...(parsed.data.title !== undefined ? { title: parsed.data.title.trim() } : {}),
      ...(parsed.data.description !== undefined
        ? { description: parsed.data.description?.trim() || null }
        : {}),
      ...(parsed.data.eventDate !== undefined
        ? { eventDate: new Date(`${parsed.data.eventDate}T00:00:00.000Z`) }
        : {}),
      ...(parsed.data.endDate !== undefined
        ? {
            endDate: parsed.data.endDate ? new Date(`${parsed.data.endDate}T00:00:00.000Z`) : null,
          }
        : {}),
      ...(parsed.data.location !== undefined ? { location: parsed.data.location?.trim() || null } : {}),
      ...(parsed.data.costCenterId !== undefined ? { costCenterId: parsed.data.costCenterId } : {}),
      ...(parsed.data.cityId !== undefined ? { cityId: parsed.data.cityId } : {}),
      ...(parsed.data.isPublished !== undefined ? { isPublished: parsed.data.isPublished } : {}),
    },
    include: { city: true, costCenter: true },
  });

  return res.json(serializeEntry(entry));
});

router.delete("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const existing = await prisma.calendarEntry.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ message: "Calendar entry not found." });
  }

  await prisma.calendarEntry.delete({ where: { id: req.params.id } });
  return res.json({ ok: true });
});

module.exports = router;
