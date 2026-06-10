require("dotenv").config();

function withMysqlSslParams(url, host) {
  if (!url || /[?&]sslaccept=/.test(url)) return url;

  const useSsl =
    process.env.DB_SSL === "true" ||
    (host && (host.includes("amazonaws.com") || host.includes("rds.amazonaws.com")));

  return useSsl ? `${url}?sslaccept=strict` : url;
}

function buildDatabaseUrlFromParts() {
  const host = process.env.DB_HOST;
  if (!host) return null;

  const user = encodeURIComponent(process.env.DB_USER || "root");
  const password = encodeURIComponent(process.env.DB_PASSWORD || "");
  const port = process.env.DB_PORT || "3306";
  const database = process.env.DB_NAME || "LocalDB";

  return withMysqlSslParams(`mysql://${user}:${password}@${host}:${port}/${database}`, host);
}

function ensureDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    process.env.DATABASE_URL = withMysqlSslParams(
      process.env.DATABASE_URL,
      process.env.DB_HOST || ""
    );
    return process.env.DATABASE_URL;
  }

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
