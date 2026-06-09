#!/usr/bin/env node
/**
 * Reads the active ngrok HTTPS URL and writes it to client/.env and backend/.env.
 * Requires: ngrok http 4000 (or NGROK_LOCAL_API=http://127.0.0.1:4040)
 * Run: npm run api:sync-ngrok
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..");
const clientEnvPath = join(repoRoot, "client", ".env");
const backendEnvPath = join(repoRoot, "backend", ".env");
const ngrokApi = (process.env.NGROK_LOCAL_API || "http://127.0.0.1:4040").replace(/\/$/, "");

async function fetchNgrokHttpsUrl() {
  const { get } = await import("node:http");
  const data = await new Promise((resolve, reject) => {
    get(`${ngrokApi}/api/tunnels`, (res) => {
      let body = "";
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 400) {
          reject(new Error(`ngrok API returned ${res.statusCode}. Is ngrok running?`));
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      });
    }).on("error", reject);
  });
  const tunnels = data.tunnels || [];
  const httpsTunnel =
    tunnels.find((t) => t.public_url?.startsWith("https://")) ||
    tunnels.find((t) => t.proto === "https");
  const url = (httpsTunnel?.public_url || "").replace(/\/$/, "");
  if (!url) {
    throw new Error("No HTTPS ngrok tunnel found. Run: npm run tunnel:ngrok");
  }
  return url;
}

function upsertEnvLine(content, key, value) {
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  if (pattern.test(content)) {
    return content.replace(pattern, line);
  }
  const trimmed = content.trimEnd();
  return trimmed ? `${trimmed}\n${line}\n` : `${line}\n`;
}

function updateEnvFile(path, updates) {
  if (!existsSync(path)) {
    throw new Error(`Missing ${path}. Create it from .env.example first.`);
  }
  let content = readFileSync(path, "utf8");
  for (const [key, value] of Object.entries(updates)) {
    content = upsertEnvLine(content, key, value);
  }
  writeFileSync(path, content.endsWith("\n") ? content : `${content}\n`);
}

try {
  const publicUrl = await fetchNgrokHttpsUrl();
  updateEnvFile(clientEnvPath, { EXPO_PUBLIC_API_BASE_URL: publicUrl });
  updateEnvFile(backendEnvPath, { PUBLIC_API_BASE_URL: publicUrl });

  console.log(`
ngrok API URL synced
====================
  ${publicUrl}

Updated:
  client/.env  → EXPO_PUBLIC_API_BASE_URL
  backend/.env → PUBLIC_API_BASE_URL

Next:
  1. Restart backend if it was already running (pick up PUBLIC_API_BASE_URL)
  2. On any phone, open ${publicUrl}/health
  3. Rebuild the app (env is baked in at build time):
       cd client && npm run build:android
     Or local dev install:
       cd client && npx expo run:android

Keep ngrok and the backend running while remote testers use the app.
`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`
Failed to sync ngrok URL: ${message}

Setup:
  1. Sign up at https://ngrok.com and copy your authtoken
  2. ngrok config add-authtoken YOUR_TOKEN
  3. npm run tunnel:ngrok   (in another terminal)
  4. npm run api:sync-ngrok
`);
  process.exit(1);
}
