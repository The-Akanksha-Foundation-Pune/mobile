#!/usr/bin/env node
/**
 * One command for phone development with the dev-client build.
 * Starts ngrok -> syncs the API URL into client/.env and backend/.env ->
 * starts the backend -> starts Expo in tunnel mode (QR code).
 * Run from repo root: npm run dev:phone
 * Press Ctrl+C once to stop everything.
 */

import { spawn, execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..");
const clientDir = join(repoRoot, "client");
const ngrokApi = (process.env.NGROK_LOCAL_API || "http://127.0.0.1:4040").replace(/\/$/, "");
const children = [];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stopAll() {
  for (const child of children) child.kill("SIGTERM");
}

process.on("SIGINT", () => {
  stopAll();
  process.exit(0);
});
process.on("SIGTERM", () => {
  stopAll();
  process.exit(0);
});

async function waitForTunnel() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${ngrokApi}/api/tunnels`);
      const data = await response.json();
      const https = (data.tunnels || []).find((t) => t.public_url?.startsWith("https://"));
      if (https?.public_url) return https.public_url.replace(/\/$/, "");
    } catch {
      // ngrok not ready yet
    }
    await sleep(500);
  }
  throw new Error("Timed out waiting for the ngrok tunnel. Is another ngrok already running?");
}

function globalNodeModules() {
  try {
    return execSync("npm root -g", { encoding: "utf8" }).trim();
  } catch {
    return "";
  }
}

execSync("node scripts/ensure-ngrok-auth.mjs", { cwd: clientDir, stdio: "inherit" });

console.log("[1/3] Starting ngrok -> localhost:4000 ...");
const ngrok = spawn("ngrok", ["http", "4000", "--log=stdout"], { cwd: repoRoot, stdio: "ignore" });
children.push(ngrok);
ngrok.on("exit", (code) => {
  if (code) {
    console.error(`ngrok exited with code ${code}`);
    stopAll();
    process.exit(code);
  }
});

try {
  const publicUrl = await waitForTunnel();
  execSync("node scripts/sync-ngrok-api-url.mjs", { cwd: clientDir, stdio: "ignore" });
  console.log(`      API tunnel: ${publicUrl}`);
} catch (error) {
  stopAll();
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

console.log("[2/3] Starting backend ...");
children.push(spawn("npm", ["--prefix", "backend", "run", "dev"], { cwd: repoRoot, stdio: "inherit" }));

console.log("[3/3] Starting Expo (tunnel) - scan the QR code with the dev app ...\n");
const nodePath = [process.env.NODE_PATH, globalNodeModules()].filter(Boolean).join(":");
children.push(
  spawn("npx", ["expo", "start", "--tunnel", "-c"], {
    cwd: clientDir,
    stdio: "inherit",
    env: { ...process.env, NODE_PATH: nodePath },
  })
);
