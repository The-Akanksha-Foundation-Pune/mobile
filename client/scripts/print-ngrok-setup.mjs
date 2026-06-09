#!/usr/bin/env node
/**
 * Prints ngrok remote-testing steps.
 * Run: npm run api:ngrok
 */

console.log(`
Remote API testing with ngrok (any city / mobile data)
======================================================

1. Install ngrok (macOS): brew install ngrok/ngrok/ngrok
2. One-time auth: ngrok config add-authtoken YOUR_TOKEN
   Get a token: https://dashboard.ngrok.com/get-started/your-authtoken

3. Start backend (repo root):
     npm run dev:backend

4. Start tunnel (separate terminal, repo root):
     npm run tunnel:ngrok

5. Sync URLs into .env files:
     npm run api:sync-ngrok

6. Verify on a phone browser:
     https://YOUR-SUBDOMAIN.ngrok-free.app/health

7. Rebuild and install APK:
     cd client && npm run build:android
   Or local debug build:
     cd client && npx expo run:android

Notes:
- Free ngrok URLs change when you restart the tunnel → run api:sync-ngrok and rebuild.
- Your laptop must stay on with backend + ngrok running.
- For production rollout, use a hosted HTTPS API instead of ngrok.
`);
