const express = require("express");
const { z } = require("zod");
const { requireAuth, requireRole } = require("../middleware/auth");
const prisma = require("../lib/prisma");

const router = express.Router();

const createTypeSchema = z.object({
  name: z.string().min(2).max(80),
});

router.get("/", requireAuth, async (_req, res) => {
  const types = await prisma.eventType.findMany({
    orderBy: { name: "asc" },
  });
  return res.json(types);
});

router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  const parsed = createTypeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid event type payload." });
  }

  const normalizedName = parsed.data.name.trim();
  const alreadyExists = await prisma.eventType.findFirst({
    where: { name: { equals: normalizedName } },
  });

  if (alreadyExists) {
    return res.status(409).json({ message: "Event type already exists." });
  }

  const nextType = await prisma.eventType.create({
    data: { name: normalizedName },
  });
  return res.status(201).json(nextType);
});

module.exports = router;
