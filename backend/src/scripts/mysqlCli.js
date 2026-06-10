const { spawnSync } = require("child_process");

function parseMysqlUrl(url) {
  const parsed = new URL(url);
  const database = parsed.pathname.replace(/^\//, "");
  if (!database) {
    throw new Error("DATABASE_URL must include a database name.");
  }

  return {
    host: parsed.hostname,
    port: parsed.port || "3306",
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database,
  };
}

function buildRailwayDatabaseUrl() {
  if (process.env.RAILWAY_DATABASE_URL) {
    return process.env.RAILWAY_DATABASE_URL;
  }

  const host = process.env.RAILWAY_DB_HOST;
  if (!host) return null;

  const user = encodeURIComponent(process.env.RAILWAY_DB_USER || "root");
  const password = encodeURIComponent(process.env.RAILWAY_DB_PASSWORD || "");
  const port = process.env.RAILWAY_DB_PORT || "3306";
  const database = process.env.RAILWAY_DB_NAME || "railway";

  return `mysql://${user}:${password}@${host}:${port}/${database}`;
}

function mysqlSslArgs(host) {
  if (host.includes("rlwy.net") || host.includes("railway.app") || process.env.DB_SSL === "true") {
    return ["--ssl-mode=REQUIRED"];
  }
  return [];
}

function runMysql(cfg, { input, extraArgs = [] } = {}) {
  const args = [
    `-h${cfg.host}`,
    `-P${cfg.port}`,
    `-u${cfg.user}`,
    ...mysqlSslArgs(cfg.host),
    ...extraArgs,
    cfg.database,
  ];

  return spawnSync("mysql", args, {
    env: { ...process.env, MYSQL_PWD: cfg.password },
    input,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

function runMysqldump(cfg, extraArgs = []) {
  const args = [
    `-h${cfg.host}`,
    `-P${cfg.port}`,
    `-u${cfg.user}`,
    "--single-transaction",
    "--routines",
    "--triggers",
    "--set-gtid-purged=OFF",
    "--no-create-db",
    ...extraArgs,
    cfg.database,
  ];

  return spawnSync("mysqldump", args, {
    env: { ...process.env, MYSQL_PWD: cfg.password },
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

function getLocalMysqlConfig() {
  require("../lib/env");

  if (process.env.DATABASE_URL) {
    return parseMysqlUrl(process.env.DATABASE_URL);
  }

  return {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || "3306",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "LocalDB",
  };
}

function sanitizeDumpForTargetDb(sql) {
  return sql
    .replace(/^mysqldump:.*\n/m, "")
    .replace(/CREATE DATABASE[^;]+;/gi, "")
    .replace(/USE `[^`]+`;/gi, "");
}

module.exports = {
  parseMysqlUrl,
  buildRailwayDatabaseUrl,
  runMysql,
  runMysqldump,
  getLocalMysqlConfig,
  sanitizeDumpForTargetDb,
};
