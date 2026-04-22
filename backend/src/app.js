const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const authRoutes = require("./routes/auth.routes");
const eventTypeRoutes = require("./routes/types.routes");
const eventRoutes = require("./routes/events.routes");

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "capture-akanksha-backend" });
});

app.use("/api/auth", authRoutes);
app.use("/api/types", eventTypeRoutes);
app.use("/api/events", eventRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Unexpected server error." });
});

module.exports = app;
