const express = require("express");
const { z } = require("zod");
const { requireAuth, requireRole } = require("../middleware/auth");
const prisma = require("../lib/prisma");

const router = express.Router();

const donorSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(160),
  costCenterId: z.string().min(1),
  isActive: z.boolean().optional(),
});

function serializeDonor(item) {
  return {
    id: item.id,
    email: item.email,
    name: item.name,
    costCenterId: item.costCenterId,
    costCenterName: item.costCenter?.name || "",
    costCenterCode: item.costCenter?.code || "",
    isActive: item.isActive,
  };
}

router.get("/", requireAuth, requireRole("admin"), async (req, res) => {
  const { costCenterId } = req.query;
  const donors = await prisma.donor.findMany({
    where: {
      ...(costCenterId ? { costCenterId: String(costCenterId) } : {}),
    },
    include: { costCenter: true },
    orderBy: { name: "asc" },
  });
  return res.json(donors.map(serializeDonor));
});

router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  const parsed = donorSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid donor payload." });
  }

  const center = await prisma.costCenter.findUnique({ where: { id: parsed.data.costCenterId } });
  if (!center) {
    return res.status(404).json({ message: "Cost center not found." });
  }

  const donor = await prisma.donor.create({
    data: {
      email: parsed.data.email.trim().toLowerCase(),
      name: parsed.data.name.trim(),
      costCenterId: parsed.data.costCenterId,
      isActive: parsed.data.isActive ?? true,
    },
    include: { costCenter: true },
  });

  return res.status(201).json(serializeDonor(donor));
});

module.exports = router;
