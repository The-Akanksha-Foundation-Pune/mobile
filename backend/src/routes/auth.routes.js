const express = require("express");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const { requireAuth } = require("../middleware/auth");
const prisma = require("../lib/prisma");
const { verifyGoogleIdToken } = require("../services/googleAuth");

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

function serializeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    cityId: user.cityId || null,
    cityName: user.city?.name || "",
    cityState: user.city?.state || "",
    costCenterId: user.costCenterId || null,
    costCenterCode: user.costCenter?.code || "",
    costCenterName: user.costCenter?.name || "",
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
    const roleByEmailPrefix = userEmail.startsWith("admin@") ? "admin" : "volunteer";

    const user = await prisma.user.upsert({
      where: { googleSub: payload.sub },
      update: {
        email: userEmail,
        name,
        profileImage: payload.picture || null,
      },
      include: profileInclude,
      create: {
        googleSub: payload.sub,
        email: userEmail,
        name,
        role: roleByEmailPrefix,
        profileImage: payload.picture || null,
      },
    });

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
  return res.json(serializeUser(user));
});

router.patch("/me", requireAuth, async (req, res) => {
  const parsed = profileUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid profile update." });
  }
  const { name, cityId, costCenterId } = parsed.data;
  const data = {};

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
  return res.json(serializeUser(user));
});

module.exports = router;
