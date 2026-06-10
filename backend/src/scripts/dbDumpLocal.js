require("../lib/env");
const fs = require("fs");
const path = require("path");
const { getLocalMysqlConfig, runMysqldump } = require("./mysqlCli");

function timestamp() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function main() {
  const cfg = getLocalMysqlConfig();
  const dumpsDir = path.join(__dirname, "../../dumps");
  fs.mkdirSync(dumpsDir, { recursive: true });

  const outfile = path.join(dumpsDir, `LocalDB-copy-${timestamp()}.sql`);
  const result = runMysqldump(cfg);

  if (result.status !== 0) {
    console.error(result.stderr || "mysqldump failed.");
    process.exit(result.status || 1);
  }

  fs.writeFileSync(outfile, result.stdout, "utf8");
  const sizeKb = Math.round(fs.statSync(outfile).size / 1024);
  console.log(`LocalDB copy saved: ${outfile} (${sizeKb} KB)`);
}

main();
