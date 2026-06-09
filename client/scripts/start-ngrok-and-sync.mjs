#!/usr/bin/env node
/**
 * Ensures ngrok auth, starts tunnel to :4000, syncs .env files.
 * Run from repo root: npm run tunnel:start
 * Requires NGROK_AUTHTOKEN if ngrok is not yet configured.
 */

import { spawn } from "node:child_process";
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..");
const ngrokApi = (process.env.NGROK_LOCAL_API || "http://127.0.0.1:4040").replace(/\/$/, "");
const maxWaitMs = 30_000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForTunnel() {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${ngrokApi}/api/tunnels`);
      if (!response.ok) throw new Error(String(response.status));
      const data = await response.json();
      const https = (data.tunnels || []).find((t) => t.public_url?.startsWith("https://"));
      if (https?.public_url) return https.public_url.replace(/\/$/, "");
    } catch {
      // ngrok web UI not ready yet
    }
    await sleep(500);
  }
  throw new Error("Timed out waiting for ngrok HTTPS tunnel (30s).");
}

execSync("node scripts/ensure-ngrok-auth.mjs", { cwd: join(repoRoot, "client"), stdio: "inherit" });

const ngrok = spawn("ngrok", ["http", "4000", "--log=stdout"], {
  cwd: repoRoot,
  stdio: ["ignore", "pipe", "pipe"],
});

let ngrokExited = false;
ngrok.on("exit", (code) => {
  ngrokExited = true;
  if (code !== 0 && code !== null) {
    console.error(`ngrok exited with code ${code}`);
    process.exit(code ?? 1);
  }
});

process.on("SIGINT", () => {
  ngrok.kill("SIGTERM");
  process.exit(0);
});

console.log("Starting ngrok → localhost:4000 …");

try {
  const publicUrl = await waitForTunnel();
  execSync("node scripts/sync-ngrok-api-url.mjs", { cwd: join(repoRoot, "client"), stdio: "inherit" });
  console.log(`\nTunnel ready: ${publicUrl}`);
  console.log("Leave this process running. Press Ctrl+C to stop ngrok.\n");
} catch (error) {
  ngrok.kill("SIGTERM");
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
}

ngrok.stdout?.on("data", (chunk) => process.stdout.write(chunk));
ngrok.stderr?.on("data", (chunk) => process.stderr.write(chunk));
