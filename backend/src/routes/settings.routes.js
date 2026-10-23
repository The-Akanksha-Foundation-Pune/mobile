const express = require("express");
const { z } = require("zod");
const { requireAuth, requirePermission } = require("../middleware/auth");
const { getLimits, setLimits } = require("../lib/settings");

const router = express.Router();

router.get("/", requireAuth, async (_req, res) => {
  return res.json({ limits: await getLimits() });
});

const limitsSchema = z.object({
  posts: z.number().int().min(0).max(100),
  stories: z.number().int().min(0).max(100),
  /** AI polish runs per draft description. Optional so older clients that only send posts/stories keep working. */
  polish: z.number().int().min(0).max(100).optional(),
});

router.patch("/limits", requireAuth, requirePermission("manage_settings"), async (req, res) => {
  const parsed = limitsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Limits must be whole numbers between 0 and 100." });
  }
  return res.json({ limits: await setLimits(parsed.data) });
});

module.exports = router;
