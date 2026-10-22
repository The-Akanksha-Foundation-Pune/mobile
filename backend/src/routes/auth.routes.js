const express = require("express");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const { requireAuth } = require("../middleware/auth");
const prisma = require("../lib/prisma");
const { verifyGoogleIdToken } = require("../services/googleAuth");
const { findEmployeeCostCenter } = require("../services/employeeCostCenter");
const { isBootstrapSuperAdmin, permissionsForRole } = require("../lib/permissions");

const router = express.Router();

const googleLoginSchema = z.object({
  idToken: z.string().min(1),
});

const profileUpdateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  cityId: z.string().min(1).nullable().optional(),
  costCenterId: z.string().min(1).nullable().optional(),
});

const profileInclude = { city: true, costCenter: true };

const costCenterFromAfdw = () => process.env.COSTCENTER_SOURCE === "employees";

/**
 * Links the user to their AFDW employee record and stores its employee_code. With
 * COSTCENTER_SOURCE=employees, AFDW also decides the person's cost centre and city: the
 * profile follows it and `costCenterLocked` tells the app to show them read-only.
 */
async function applyEmployeeCostCenter(user) {
  try {
    const employee = await findEmployeeCostCenter(user);
    if (!employee) return { ...user, costCenterLocked: false };

    const data = {};
    if (employee.employeeCode && user.employeeCode !== employee.employeeCode) {
      data.employeeCode = employee.employeeCode;
    }
    const center = costCenterFromAfdw() ? employee.center : null;
    if (center && (user.costCenterId !== center.id || user.cityId !== center.cityId)) {
      data.costCenterId = center.id;
      data.cityId = center.cityId;
    }
    if (Object.keys(data).length) {
      user = await prisma.user.update({ where: { id: user.id }, data, include: profileInclude });
    }
    return { ...user, costCenterLocked: Boolean(center) };
  } catch (error) {
    // P2002: another account already holds this employee code; leave this one unlinked.
    console.error("AFDW employee lookup failed:", error.code || "", error.message);
    return user;
  }
}

function serializeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    employeeCode: user.employeeCode || "",
    role: user.role,
    createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : null,
    cityId: user.cityId || null,
    cityName: user.city?.name || "",
    cityState: user.city?.state || "",
    costCenterId: user.costCenterId || null,
    costCenterCode: user.costCenter?.code || "",
    costCenterName: user.costCenter?.name || "",
    costCenterPath: user.costCenter?.description || "",
    costCenterLocked: Boolean(user.costCenterLocked),
    permissions: permissionsForRole(user.role),
  };
}

router.post("/google", async (req, res) => {
  const parsed = googleLoginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid Google login payload." });
  }

  try {
    if (process.env.NODE_ENV !== "production") {
      console.log("Auth debug: received Google login request");
    }
    const payload = await verifyGoogleIdToken(parsed.data.idToken);
    const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN || "akanksha.org";
    const userEmail = String(payload.email).toLowerCase();

    if (!userEmail.endsWith(`@${allowedDomain}`)) {
      return res.status(403).json({
        message: `Only @${allowedDomain} users can access this app.`,
      });
    }

    const name = payload.name || userEmail.split("@")[0];
    const bootstrapSuperAdmin = isBootstrapSuperAdmin(userEmail);

    let user = await prisma.user.upsert({
      where: { googleSub: payload.sub },
      update: {
        email: userEmail,
        name,
        profileImage: payload.picture || null,
        // Listed Super Admins are promoted on every login so the first one can always get in.
        ...(bootstrapSuperAdmin ? { role: "super_admin" } : {}),
      },
      include: profileInclude,
      create: {
        googleSub: payload.sub,
        email: userEmail,
        name,
        role: bootstrapSuperAdmin ? "super_admin" : "user",
        profileImage: payload.picture || null,
      },
    });

    user = await applyEmployeeCostCenter(user);

    const token = jwt.sign(
      {
        sub: user.id,
        role: user.role,
        email: user.email,
      },
      process.env.JWT_SECRET || "dev-secret",
      { expiresIn: "1d" }
    );

    return res.json({
      token,
      user: serializeUser(user),
    });
  } catch (error) {
    const message = String(error?.message || error || "");
    console.error("Google authentication error:", message);

    if (message.includes("No Google OAuth client IDs configured")) {
      return res.status(503).json({ message: "Server Google auth is not configured." });
    }

    const isDbError =
      error?.name === "PrismaClientInitializationError" ||
      /^P\d{4}/.test(String(error?.code || "")) ||
      /connect|database|prisma/i.test(message);
    if (isDbError) {
      return res.status(503).json({ message: "Database unavailable. Check server DATABASE_URL." });
    }

    const debugMessage = process.env.NODE_ENV !== "production" ? ` ${message}` : "";
    return res.status(401).json({ message: `Google authentication failed.${debugMessage}`.trim() });
  }
});

router.post("/login", (_req, res) => {
  return res.status(410).json({
    message: "Password login is disabled. Use /api/auth/google instead.",
  });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    include: profileInclude,
  });
  return res.json(serializeUser(await applyEmployeeCostCenter(user)));
});

router.patch("/me", requireAuth, async (req, res) => {
  const parsed = profileUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid profile update." });
  }
  let { name, cityId, costCenterId } = parsed.data;
  const data = {};

  // Cost centre and city come from AFDW when the person is in it; only the name is theirs to edit.
  if (costCenterFromAfdw() && (cityId !== undefined || costCenterId !== undefined)) {
    const assigned = await findEmployeeCostCenter(req.user).catch(() => null);
    if (assigned?.center) {
      cityId = undefined;
      costCenterId = undefined;
    }
  }

  if (name !== undefined) data.name = name;

  let nextCityId = cityId;
  if (costCenterId) {
    const costCenter = await prisma.costCenter.findUnique({ where: { id: costCenterId } });
    if (!costCenter) {
      return res.status(404).json({ message: "Selected cost center does not exist." });
    }
    if (nextCityId && costCenter.cityId && costCenter.cityId !== nextCityId) {
      return res.status(400).json({ message: "That cost center belongs to a different city." });
    }
    if (nextCityId === undefined && costCenter.cityId) nextCityId = costCenter.cityId;
    data.costCenterId = costCenterId;
  } else if (costCenterId === null) {
    data.costCenterId = null;
  }

  if (nextCityId) {
    const city = await prisma.city.findUnique({ where: { id: nextCityId } });
    if (!city) {
      return res.status(404).json({ message: "Selected city does not exist." });
    }
    data.cityId = nextCityId;
  } else if (nextCityId === null) {
    data.cityId = null;
    // Clearing the city also clears a cost center that no longer fits.
    if (costCenterId === undefined) data.costCenterId = null;
  }

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data,
    include: profileInclude,
  });
  return res.json(serializeUser(await applyEmployeeCostCenter(user)));
});

module.exports = router;
