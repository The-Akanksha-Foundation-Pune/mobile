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
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Google authentication error:", error);
    const debugMessage =
      process.env.NODE_ENV !== "production" ? ` ${String(error?.message || "")}` : "";
    return res.status(401).json({ message: `Google authentication failed.${debugMessage}`.trim() });
  }
});

router.post("/login", (_req, res) => {
  return res.status(410).json({
    message: "Password login is disabled. Use /api/auth/google instead.",
  });
});

router.get("/me", requireAuth, (req, res) => {
  return res.json({
    id: req.user.id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
  });
});

module.exports = router;
