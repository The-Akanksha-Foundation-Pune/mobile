// Runs before `npm start`: creates the database and tables if they don't exist (and applies
// schema changes from prisma/schema.prisma), then seeds base data. Existing data is kept.
// Loads lib/env first so DATABASE_URL is also built from DB_* parts for the Prisma CLI.
require("../lib/env");
const path = require("path");
const { spawnSync } = require("child_process");

const backendDir = path.join(__dirname, "../..");

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: backendDir,
    env: process.env,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL (or DB_HOST + DB_* parts) is not set in backend/.env.");
  process.exit(1);
}

// No --accept-data-loss: a schema change that would drop data stops the start instead.
run("npx", ["prisma", "db", "push"]);
run("node", ["src/scripts/seed.js"]);
