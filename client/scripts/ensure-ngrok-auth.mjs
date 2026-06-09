#!/usr/bin/env node
/**
 * Configures ngrok authtoken from NGROK_AUTHTOKEN when not yet set.
 * Run: NGROK_AUTHTOKEN=xxx npm run ngrok:auth
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..");

function readTokenFromEnvFile(path) {
  if (!existsSync(path)) return "";
  const match = readFileSync(path, "utf8").match(/^NGROK_AUTHTOKEN=(.+)$/m);
  return match ? match[1].trim().replace(/^["']|["']$/g, "") : "";
}

const token = (
  process.env.NGROK_AUTHTOKEN ||
  readTokenFromEnvFile(join(repoRoot, "backend", ".env")) ||
  readTokenFromEnvFile(join(repoRoot, "client", ".env"))
).trim();
const configPath = join(homedir(), "Library", "Application Support", "ngrok", "ngrok.yml");

function hasAuthtoken() {
  if (!existsSync(configPath)) return false;
  return /authtoken:\s*\S+/.test(readFileSync(configPath, "utf8"));
}

if (hasAuthtoken()) {
  console.log("ngrok authtoken already configured.");
  process.exit(0);
}

if (!token) {
  console.error(`
ngrok authtoken is not configured.

1. Sign up: https://dashboard.ngrok.com/signup
2. Copy your token: https://dashboard.ngrok.com/get-started/your-authtoken
3. Run once:
     NGROK_AUTHTOKEN=your_token npm run ngrok:auth
   Or:
     ngrok config add-authtoken your_token
`);
  process.exit(1);
}

execSync(`ngrok config add-authtoken ${token}`, { stdio: "inherit" });
console.log("ngrok authtoken saved.");
