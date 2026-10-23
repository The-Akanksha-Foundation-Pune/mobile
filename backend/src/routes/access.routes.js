const express = require("express");
const { z } = require("zod");
const { requireAuth, requirePermission } = require("../middleware/auth");
const prisma = require("../lib/prisma");
const { ROLES, ROLE_LABELS, permissionsForRole } = require("../lib/permissions");

const router = express.Router();

router.use(requireAuth, requirePermission("manage_access"));

const userInclude = { city: true, costCenter: true };

function serializeAccessUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    roleLabel: ROLE_LABELS[user.role] || user.role,
    permissions: permissionsForRole(user.role),
    cityName: user.city?.name || "",
    costCenterCode: user.costCenter?.code || "",
    createdAt: user.createdAt,
  };
}

router.get("/roles", (_req, res) => {
  return res.json(ROLES.map((role) => ({ id: role, label: ROLE_LABELS[role], permissions: permissionsForRole(role) })));
});

router.get("/users", async (req, res) => {
  const q = String(req.query.q || "").trim();
  const users = await prisma.user.findMany({
    where: q ? { OR: [{ name: { contains: q } }, { email: { contains: q } }] } : undefined,
    include: userInclude,
    orderBy: [{ name: "asc" }],
    take: 200,
  });
  return res.json(users.map(serializeAccessUser));
});

const roleSchema = z.object({ role: z.enum(ROLES) });

router.patch("/users/:id/role", async (req, res) => {
  const parsed = roleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Choose a valid role." });
  }
  const target = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!target) {
    return res.status(404).json({ message: "User not found." });
  }
  if (target.role === "super_admin" && parsed.data.role !== "super_admin") {
    const remaining = await prisma.user.count({ where: { role: "super_admin" } });
    if (remaining <= 1) {
      return res.status(400).json({ message: "Keep at least one Super Admin." });
    }
  }
  const updated = await prisma.user.update({
    where: { id: target.id },
    data: { role: parsed.data.role },
    include: userInclude,
  });
  return res.json(serializeAccessUser(updated));
});

module.exports = router;
