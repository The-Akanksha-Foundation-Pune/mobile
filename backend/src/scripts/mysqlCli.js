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

module.exports = {
  parseMysqlUrl,
  runMysqldump,
  getLocalMysqlConfig,
};
