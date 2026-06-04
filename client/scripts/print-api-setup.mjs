#!/usr/bin/env node
/**
 * Prints LAN API URL guidance for physical device testing.
 * Run: npm run api:setup
 */

import { execSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const clientRoot = join(__dirname, "..");
const envPath = join(clientRoot, ".env");

function detectLanIp() {
  const commands = [
    "ipconfig getifaddr en0",
    "ipconfig getifaddr en1",
    "hostname -I 2>/dev/null | awk '{print $1}'",
  ];
  for (const cmd of commands) {
    try {
      const ip = execSync(cmd, { encoding: "utf8", shell: "/bin/bash" }).trim();
      if (ip && /^\d+\.\d+\.\d+\.\d+$/.test(ip)) return ip;
    } catch {
      // try next interface
    }
  }
  return null;
}

const lanIp = detectLanIp();
const suggestedUrl = lanIp ? `http://${lanIp}:4000` : "http://YOUR_LAN_IP:4000";
let currentUrl = "(not set)";

if (existsSync(envPath)) {
  const match = readFileSync(envPath, "utf8").match(/^EXPO_PUBLIC_API_BASE_URL=(.+)$/m);
  if (match) currentUrl = match[1].trim();
}

console.log(`
Backend API setup for physical Android/iOS (Network request failed fix)
=======================================================================

Current EXPO_PUBLIC_API_BASE_URL in client/.env:
  ${currentUrl}

Physical phones cannot reach 127.0.0.1 on your laptop. Use your LAN IP instead:

  EXPO_PUBLIC_API_BASE_URL=${suggestedUrl}

Steps:
  1. Edit client/.env with the line above
  2. Start backend from repo root: npm run dev:backend
  3. On your phone's browser, open ${suggestedUrl}/health — you should see {"ok":true,...}
  4. Rebuild the APK (env is baked in at build time):
       cd client && npm run build:android
  5. Install the new APK and try Google sign-in again

Phone and computer must be on the same Wi‑Fi. If /health fails in the phone browser, fix
network/firewall before rebuilding the app.
`);
