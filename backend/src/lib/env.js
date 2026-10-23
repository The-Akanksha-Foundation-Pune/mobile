require("dotenv").config();
const path = require("path");

function withMysqlSslParams(url, host) {
  if (!url || /[?&]sslaccept=/.test(url)) return url;

  const useSsl =
    process.env.DB_SSL === "true" ||
    (host && (host.includes("amazonaws.com") || host.includes("rds.amazonaws.com")));
  if (!useSsl) return url;

  // RDS certificates are signed by Amazon's own CA, which Prisma does not trust by default.
  // Without DB_SSL_CA the connection is still encrypted, using Prisma's default
  // sslaccept=accept_invalid_certs. Set DB_SSL_CA to the CA bundle (e.g. AWS
  // global-bundle.pem, relative to backend/) to also verify the server certificate.
  const ca = process.env.DB_SSL_CA;
  if (!ca) return url;
  const caPath = encodeURIComponent(path.resolve(__dirname, "../..", ca));
  return `${url}${url.includes("?") ? "&" : "?"}sslaccept=strict&sslcert=${caPath}`;
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
