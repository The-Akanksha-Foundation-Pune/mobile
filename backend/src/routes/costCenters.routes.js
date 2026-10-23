const express = require("express");
const { z } = require("zod");
const { requireAuth, requirePermission } = require("../middleware/auth");
const prisma = require("../lib/prisma");
const {
  syncCostCentersFromFinance,
  serializeCostCenter,
} = require("../services/financeCostCenter");
const { syncCostCentersFromEmployees } = require("../services/employeeCostCenter");

const router = express.Router();

const costCenterSchema = z.object({
  code: z.string().min(1).max(40),
  name: z.string().min(1).max(160),
  description: z.string().max(2000).optional().nullable(),
  cityId: z.string().min(1).optional().nullable(),
  sortOrder: z.coerce.number().int().optional(),
  isActive: z.boolean().optional(),
});

// COSTCENTER_SOURCE=employees builds cost centres from AFDW.employees; otherwise the Finance table.
const useEmployeeSource = () => process.env.COSTCENTER_SOURCE === "employees";
const syncCostCenters = () =>
  useEmployeeSource() ? syncCostCentersFromEmployees() : syncCostCentersFromFinance();

// Listing triggers the sync, so throttle it: the source changes rarely and each run writes every row.
const SYNC_INTERVAL_MS = 10 * 60 * 1000;
let lastSyncAt = 0;

async function listCostCentersWithCityOnly() {
  const useFinance = process.env.FINANCE_COSTCENTER_SYNC !== "false";
  if (useFinance && Date.now() - lastSyncAt > SYNC_INTERVAL_MS) {
    try {
      await syncCostCenters();
      lastSyncAt = Date.now();
    } catch (error) {
      console.error("Cost center sync failed:", error.message);
      if (process.env.FINANCE_COSTCENTER_REQUIRED === "true") {
        throw error;
      }
    }
  }

  const centers = await prisma.costCenter.findMany({
    where: {
      isActive: true,
      cityId: { not: null },
    },
    include: { city: true, _count: { select: { donors: true } } },
    orderBy: [{ city: { sortOrder: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
  });

  return centers.map(serializeCostCenter);
}

router.get("/", requireAuth, async (_req, res) => {
  try {
    const centers = await listCostCentersWithCityOnly();
    return res.json(centers);
  } catch (error) {
    return res.status(503).json({
      message: error.message || "Failed to load cost centers from Finance.",
    });
  }
});

router.get("/sync-status", requireAuth, requirePermission("manage_settings"), async (_req, res) => {
  try {
    const result = await syncCostCenters();
    lastSyncAt = Date.now();
    return res.json({
      source: useEmployeeSource() ? "employees" : "finance",
      syncedCount: result.synced.length,
      skippedCount: result.skipped.length,
      deactivatedCount: result.deactivated ?? 0,
      citiesAdded: result.citiesAdded ?? 0,
      columnMap: result.columnMap,
      skipped: result.skipped.slice(0, 50),
    });
  } catch (error) {
    return res.status(503).json({ message: error.message || "Finance sync failed." });
  }
});

router.get("/all", requireAuth, requirePermission("manage_settings"), async (_req, res) => {
  try {
    await listCostCentersWithCityOnly();
  } catch (_error) {
    // Admin list still returns DB state even if finance sync fails.
  }

  const centers = await prisma.costCenter.findMany({
    where: { cityId: { not: null } },
    include: { city: true, _count: { select: { donors: true } } },
    orderBy: [{ city: { sortOrder: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
  });
  return res.json(centers.map(serializeCostCenter));
});

/** Codes are unique and stored upper-case; true when another cost center already uses this one. */
async function codeTaken(code, exceptId = null) {
  const match = await prisma.costCenter.findUnique({ where: { code: code.trim().toUpperCase() } });
  return Boolean(match && match.id !== exceptId);
}

router.post("/", requireAuth, requirePermission("manage_settings"), async (req, res) => {
  const parsed = costCenterSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid cost center payload." });
  }

  if (!parsed.data.cityId) {
    return res.status(400).json({ message: "cityId is required for cost centers." });
  }

  const city = await prisma.city.findUnique({ where: { id: parsed.data.cityId } });
  if (!city) {
    return res.status(404).json({ message: "City not found." });
  }

  if (await codeTaken(parsed.data.code)) {
    return res.status(409).json({ message: "A cost center with this code already exists." });
  }

  const center = await prisma.costCenter.create({
    data: {
      code: parsed.data.code.trim().toUpperCase(),
      name: parsed.data.name.trim(),
      description: parsed.data.description?.trim() || null,
      cityId: parsed.data.cityId,
      sortOrder: parsed.data.sortOrder ?? 0,
      isActive: parsed.data.isActive ?? true,
    },
    include: { city: true, _count: { select: { donors: true } } },
  });

  return res.status(201).json(serializeCostCenter(center));
});

router.patch("/:id", requireAuth, requirePermission("manage_settings"), async (req, res) => {
  const parsed = costCenterSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid cost center update." });
  }

  const existing = await prisma.costCenter.findUnique({ where: { id: req.params.id } });
  if (!existing) {
    return res.status(404).json({ message: "Cost center not found." });
  }

  if (parsed.data.cityId) {
    const city = await prisma.city.findUnique({ where: { id: parsed.data.cityId } });
    if (!city) {
      return res.status(404).json({ message: "City not found." });
    }
  }

  if (parsed.data.code !== undefined && (await codeTaken(parsed.data.code, existing.id))) {
    return res.status(409).json({ message: "A cost center with this code already exists." });
  }

  const center = await prisma.costCenter.update({
    where: { id: req.params.id },
    data: {
      ...(parsed.data.code !== undefined ? { code: parsed.data.code.trim().toUpperCase() } : {}),
      ...(parsed.data.name !== undefined ? { name: parsed.data.name.trim() } : {}),
      ...(parsed.data.description !== undefined
        ? { description: parsed.data.description?.trim() || null }
        : {}),
      ...(parsed.data.cityId !== undefined ? { cityId: parsed.data.cityId } : {}),
      ...(parsed.data.sortOrder !== undefined ? { sortOrder: parsed.data.sortOrder } : {}),
      ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : {}),
    },
    include: { city: true, _count: { select: { donors: true } } },
  });

  return res.json(serializeCostCenter(center));
});

module.exports = router;
