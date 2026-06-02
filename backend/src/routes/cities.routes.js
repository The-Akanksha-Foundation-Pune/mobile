const express = require("express");
const { z } = require("zod");
const { ALLOWED_CITY_NAMES } = require("../constants/allowedCities");
const { requireAuth, requireRole } = require("../middleware/auth");
const prisma = require("../lib/prisma");

const allowedCityFilter = { name: { in: ALLOWED_CITY_NAMES } };

const router = express.Router();

const citySchema = z.object({
  name: z.string().min(1).max(120),
  state: z.string().max(120).optional().nullable(),
  sortOrder: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
});

router.get("/", requireAuth, async (_req, res) => {
  const cities = await prisma.city.findMany({
    where: { isActive: true, ...allowedCityFilter },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return res.json(cities);
});

router.get("/all", requireAuth, requireRole("admin"), async (_req, res) => {
  const cities = await prisma.city.findMany({
    where: allowedCityFilter,
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return res.json(cities);
});

router.post("/", requireAuth, requireRole("admin"), async (req, res) => {
  const parsed = citySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid city payload." });
  }

  if (!ALLOWED_CITY_NAMES.includes(parsed.data.name.trim())) {
    return res.status(400).json({ message: "Only Mumbai, Pune, and Nagpur are supported." });
  }

  const city = await prisma.city.create({
    data: {
      name: parsed.data.name.trim(),
      state: parsed.data.state?.trim() || null,
      sortOrder: parsed.data.sortOrder ?? 0,
      isActive: parsed.data.isActive ?? true,
    },
  });

  return res.status(201).json(city);
});

router.patch("/:id", requireAuth, requireRole("admin"), async (req, res) => {
  const parsed = citySchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid city update payload." });
  }

  const existing = await prisma.city.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ message: "City not found." });
  }

  if (parsed.data.name !== undefined && !ALLOWED_CITY_NAMES.includes(parsed.data.name.trim())) {
    return res.status(400).json({ message: "Only Mumbai, Pune, and Nagpur are supported." });
  }

  const city = await prisma.city.update({
    where: { id: req.params.id },
    data: {
      ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
      ...(parsed.data.state !== undefined ? { state: parsed.data.state?.trim() || null } : {}),
      ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
      ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
    },
  });

  return res.json(city);
});

module.exports = router;
