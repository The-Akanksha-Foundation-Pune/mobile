require("../lib/env");
const fs = require("fs");
const path = require("path");
const {
  buildRailwayDatabaseUrl,
  parseMysqlUrl,
  runMysql,
  sanitizeDumpForTargetDb,
} = require("./mysqlCli");

function resolveDumpFile() {
  const arg = process.argv[2];
  if (arg) {
    if (!fs.existsSync(arg)) {
      console.error(`Dump file not found: ${arg}`);
      process.exit(1);
    }
    return arg;
  }

  const dumpsDir = path.join(__dirname, "../../dumps");
  if (!fs.existsSync(dumpsDir)) {
    console.error("No dumps/ directory. Run npm run db:dump first.");
    process.exit(1);
  }

  const dumps = fs
    .readdirSync(dumpsDir)
    .filter((name) => name.endsWith(".sql"))
    .map((name) => ({
      name,
      mtime: fs.statSync(path.join(dumpsDir, name)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);

  if (!dumps.length) {
    console.error("No .sql dumps found. Run npm run db:dump first.");
    process.exit(1);
  }

  return path.join(dumpsDir, dumps[0].name);
}

function main() {
  const railwayUrl = buildRailwayDatabaseUrl();
  if (!railwayUrl) {
    console.error(
      "Set RAILWAY_DATABASE_URL or RAILWAY_DB_HOST (+ USER, PASSWORD, PORT, NAME) in backend/.env."
    );
    process.exit(1);
  }

  const cfg = parseMysqlUrl(railwayUrl);
  if (!cfg.password) {
    console.error("Railway MySQL password is missing. Copy MYSQLPASSWORD from Railway → Variables.");
    process.exit(1);
  }

  const dumpFile = resolveDumpFile();
  const rawSql = fs.readFileSync(dumpFile, "utf8");
  const sql = sanitizeDumpForTargetDb(rawSql);

  console.log(`Importing ${dumpFile}`);
  console.log(`Target: ${cfg.host}:${cfg.port}/${cfg.database}`);

  const ping = runMysql(cfg, { extraArgs: ["-e", "SELECT 1 AS ok;"] });
  if (ping.status !== 0) {
    console.error(ping.stderr || "Could not connect to Railway MySQL.");
    process.exit(ping.status || 1);
  }

  const result = runMysql(cfg, { input: sql });
  if (result.status !== 0) {
    console.error(result.stderr || "Import failed.");
    process.exit(result.status || 1);
  }

  const tables = runMysql(cfg, {
    extraArgs: ["-N", "-e", "SHOW TABLES;"],
  });
  const tableCount = tables.stdout.trim().split("\n").filter(Boolean).length;

  console.log(`Import complete. ${tableCount} tables in Railway database "${cfg.database}".`);
}

main();
