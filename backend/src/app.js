const path = require("path");
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const authRoutes = require("./routes/auth.routes");
const aiRoutes = require("./routes/ai.routes");
const eventTypeRoutes = require("./routes/types.routes");
const eventRoutes = require("./routes/events.routes");
const cityRoutes = require("./routes/cities.routes");
const costCenterRoutes = require("./routes/costCenters.routes");
const donorRoutes = require("./routes/donors.routes");
const calendarRoutes = require("./routes/calendar.routes");
const notificationRoutes = require("./routes/notifications.routes");
const adminRoutes = require("./routes/admin.routes");
const prisma = require("./lib/prisma");
const { getAllowedGoogleClientIds } = require("./services/googleAuth");

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    // OAuth popup on web needs same-origin-allow-popups so window.close() works after Google redirect.
    crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  })
);
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "capture-akanksha-backend" });
});

app.get("/health/ready", async (_req, res) => {
  const googleClientIds = getAllowedGoogleClientIds();
  const checks = {
    googleOAuthConfigured: googleClientIds.length > 0,
    databaseUrlConfigured: Boolean(process.env.DATABASE_URL),
    jwtSecretConfigured: Boolean(
      process.env.JWT_SECRET && process.env.JWT_SECRET !== "replace_with_long_random_secret"
    ),
  };

  let database = "ok";
  let databaseHint = null;
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    database = "error";
    const message = String(error?.message || "");
    if (/can't reach database server|econnrefused|etimedout|enotfound/i.test(message)) {
      databaseHint =
        "Cannot reach MySQL host. For AWS RDS: enable Public access, open security group port 3306 to Vercel (0.0.0.0/0 for testing), and verify DB_HOST.";
    } else if (/access denied|p1010/i.test(message)) {
      databaseHint = "MySQL credentials rejected. Check DB_USER, DB_PASSWORD, and DATABASE_URL on Vercel.";
    } else if (/does not exist|unknown database/i.test(message)) {
      databaseHint = "Database name not found on server. Check DB_NAME and run prisma db push against RDS.";
    } else if (/ssl|tls|certificate/i.test(message)) {
      databaseHint = "SSL/TLS required. RDS URLs should include ?sslaccept=strict (auto-added for amazonaws.com hosts).";
    } else {
      databaseHint = "Database connection failed. Check Vercel env vars and RDS network rules.";
    }
  }

  const ok =
    checks.googleOAuthConfigured &&
    checks.databaseUrlConfigured &&
    checks.jwtSecretConfigured &&
    database === "ok";

  res.status(ok ? 200 : 503).json({
    ok,
    service: "capture-akanksha-backend",
    checks: { ...checks, database, ...(databaseHint ? { databaseHint } : {}) },
  });
});

const uploadsDir = path.join(__dirname, "..", "uploads");
app.use("/media", express.static(uploadsDir));

app.use("/api/auth", authRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/types", eventTypeRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/cities", cityRoutes);
app.use("/api/cost-centers", costCenterRoutes);
app.use("/api/donors", donorRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Unexpected server error." });
});

module.exports = app;
