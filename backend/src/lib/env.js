require("dotenv").config();

function buildDatabaseUrlFromParts() {
  const host = process.env.DB_HOST;
  if (!host) return null;

  const user = encodeURIComponent(process.env.DB_USER || "root");
  const password = encodeURIComponent(process.env.DB_PASSWORD || "");
  const port = process.env.DB_PORT || "3306";
  const database = process.env.DB_NAME || "LocalDB";

  return `mysql://${user}:${password}@${host}:${port}/${database}`;
}

function ensureDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const built = buildDatabaseUrlFromParts();
  if (built) {
    process.env.DATABASE_URL = built;
  }

  return process.env.DATABASE_URL;
}

ensureDatabaseUrl();

module.exports = {
  ensureDatabaseUrl,
};
