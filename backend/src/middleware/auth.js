const jwt = require("jsonwebtoken");
const prisma = require("../lib/prisma");

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or invalid auth token." });
  }

  const token = authHeader.slice("Bearer ".length);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
    });

    if (!user) {
      return res.status(401).json({ message: "User no longer exists." });
    }

    req.user = user;
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired auth token." });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Forbidden for this user role." });
    }
    return next();
  };
}

module.exports = {
  requireAuth,
  requireRole,
};
