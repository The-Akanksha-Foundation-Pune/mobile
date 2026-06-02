const express = require("express");
const { z } = require("zod");
const { requireAuth, requireRole } = require("../middleware/auth");
const prisma = require("../lib/prisma");

const router = express.Router();

const notifySchema = z.object({
  costCenterId: z.string().min(1),
  eventId: z.string().min(1).optional(),
  subject: z.string().min(1).max(200),
  message: z.string().min(1).max(5000),
});

/** Record donor notifications for a cost center (email delivery can be wired later). */
router.post("/donors", requireAuth, requireRole("admin"), async (req, res) => {
  const parsed = notifySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid notification payload." });
  }

  const center = await prisma.costCenter.findUnique({
    where: { id: parsed.data.costCenterId },
    include: { donors: { where: { isActive: true } } },
  });
  if (!center) {
    return res.status(404).json({ message: "Cost center not found." });
  }

  if (parsed.data.eventId) {
    const event = await prisma.event.findUnique({ where: { id: parsed.data.eventId } });
    if (!event || event.costCenterId !== parsed.data.costCenterId) {
      return res.status(400).json({ message: "Event does not belong to this cost center." });
    }
  }

  if (center.donors.length === 0) {
    return res.status(400).json({ message: "No active donors registered for this cost center." });
  }

  const rows = await prisma.$transaction(
    center.donors.map((donor) =>
      prisma.donorNotification.create({
        data: {
          donorId: donor.id,
          costCenterId: center.id,
          eventId: parsed.data.eventId || null,
          subject: parsed.data.subject.trim(),
          message: parsed.data.message.trim(),
        },
      })
    )
  );

  return res.status(201).json({
    ok: true,
    costCenterId: center.id,
    costCenterName: center.name,
    notifiedCount: rows.length,
    message: `Notification queued for ${rows.length} donor(s).`,
  });
});

router.get("/history", requireAuth, requireRole("admin"), async (req, res) => {
  const { costCenterId } = req.query;
  const history = await prisma.donorNotification.findMany({
    where: costCenterId ? { costCenterId: String(costCenterId) } : {},
    include: { donor: true, costCenter: true, event: true },
    orderBy: { sentAt: "desc" },
    take: 100,
  });

  return res.json(
    history.map((row) => ({
      id: row.id,
      subject: row.subject,
      message: row.message,
      sentAt: row.sentAt,
      donorName: row.donor.name,
      donorEmail: row.donor.email,
      costCenterName: row.costCenter.name,
      eventTitle: row.event?.title || null,
    }))
  );
});

module.exports = router;
