# Capture Akanksha App

Cross-platform event capture app for Akanksha employees and volunteers.

## Tech Stack

- Mobile: Expo + React Native (Android + iOS)
- Backend API: Node.js + Express.js
- SQL Database: Prisma + MySQL
- Auth: Google OAuth2 (ID token sign-in)
- Media Storage: Google Drive (service account upload)

## Project Structure

- `backend` - Express API with auth, event types, and event upload routes
- `mobile` - Expo app for login, media capture, caption, and grouped event browsing
- root `package.json` - common startup commands for backend + frontend

## Common Start Commands (Root)

Run from project root (`captureAkanksha`):

- `npm run dev:all` - start backend + Expo frontend together
- `npm run dev:web-android:full` - start backend + Expo frontend (use for both web and Android)
- `npm run dev:web:full` - start backend + web frontend
- `npm run dev:android:full` - start backend + Android frontend
- `npm run dev:ios:full` - start backend + iOS frontend

Individual starts:

- `npm run dev:backend`
- `npm run dev:frontend`
- `npm run dev:web`
- `npm run dev:web:only`
- `npm run dev:android`
- `npm run dev:android:only`
- `npm run dev:android:lan` (best for physical Android device via Expo Go)
- `npm run dev:ios`

## Backend Setup

1. Go to backend folder:
   - `cd backend`
2. Create env file from template:
   - `cp .env.example .env`
3. Generate Prisma client and push schema:
   - `npm run prisma:generate`
   - `npm run db:push`
4. Seed event types:
   - `npm run db:seed`
5. Start server:
   - `npm run dev`

Backend runs on `http://localhost:4000`.

### Backend Environment Variables

- `DATABASE_URL` (default MySQL value in `.env.example`)
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET`
- `GOOGLE_CLIENT_ID` (Google OAuth Web Client ID used for token verification)
- `ALLOWED_EMAIL_DOMAIN` (default `akanksha.org`)
- `GOOGLE_AI_API_KEY` (Google AI Studio key for Gemini — powers **Polish** on event descriptions in Add Event)
- `GOOGLE_AI_MODEL` (optional, e.g. `gemini-2.5-flash`; defaults to `gemini-2.5-flash` then `gemini-2.5-pro`)
- `GOOGLE_DRIVE_FOLDER_ID`
- `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`

### Google Drive Setup

1. Create a Google service account in your GCP project.
2. Enable Google Drive API.
3. Create a Drive folder for event media.
4. Share that folder with the service account email.
5. Add folder id and service-account credentials to backend `.env`.

## Mobile Setup

1. Go to client folder:
   - `cd client`
2. Update API URL in `client/.env`:
   - **Same Wi‑Fi (LAN):** `EXPO_PUBLIC_API_BASE_URL=http://YOUR_LAN_IP:4000` (not `127.0.0.1`)
     - Run `cd client && npm run api:setup` for your LAN IP and full steps
     - Verify on phone browser: `http://YOUR_LAN_IP:4000/health` must return `{"ok":true,...}` before rebuilding
   - **Remote testers (other city / mobile data):** use ngrok — run `npm run api:ngrok` for full steps:
     1. `ngrok config add-authtoken YOUR_TOKEN` (one-time, from [ngrok dashboard](https://dashboard.ngrok.com/get-started/your-authtoken))
     2. `npm run dev:backend`
     3. `npm run tunnel:ngrok` (separate terminal)
     4. `npm run api:sync-ngrok` → updates `client/.env` and `backend/.env` (`PUBLIC_API_BASE_URL`)
     5. Open `https://….ngrok-free.app/health` on the phone, then rebuild the APK
     - Keep backend + ngrok running on your machine while testers use the app
3. Configure Google OAuth client IDs in `client/src/config/constants.ts` and `client/app.json` (plugin block).
4. **Android Google sign-in (`DEVELOPER_ERROR` fix):**
   - Package name must be `org.akanksha.capture` (see `client/app.json`).
   - Print all required fingerprints and steps: `cd client && npm run google:setup`
   - In [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials → your **Android** OAuth client → add **both**:
     - **Local debug** SHA-1 (`npm run android:fingerprints`) — for `npx expo run:android`
     - **EAS build** SHA-1 (`npx eas credentials -p android`) — for preview APK installs from `npm run build:android`
   - Rebuild and reinstall after credential changes: `cd client && npx expo run:android` or `npm run build:android` (not Expo Go alone).
5. Health check before EAS build:
   - `cd client && npm run doctor` (should report 18/18 checks passed)
6. Start app from repo root:
   - `npm run dev:web-android:full`
7. Run on device/emulator:
   - Android: `npm run dev:android` or press `a` in Expo
   - iOS: `npm run dev:ios`

## Vercel Web Deploy (testing)

Two options:

### A) Web only (easiest — backend stays local or ngrok)

1. Push the repo to GitHub and import it in [Vercel](https://vercel.com).
2. Set **Root Directory** to `client`.
3. Vercel reads `client/vercel.json` (`build:web` → `dist/`).
4. In Vercel → **Environment Variables**, set:
   - `EXPO_PUBLIC_API_BASE_URL` = your public API (e.g. `https://….ngrok-free.app` from `npm run api:sync-ngrok`, or another hosted API).
5. Redeploy after changing env vars (they are baked in at build time).
6. In Google Cloud Console → OAuth **Web** client → add your Vercel URL to **Authorized JavaScript origins** (and redirect URIs if prompted).

Keep `npm run dev:backend` (+ ngrok if remote) running while testers use the hosted web app.

### B) Web + API on Vercel (full stack)

1. Import the repo with **Root Directory** = repository root (uses root `vercel.json` + `api/index.js`).
2. Set backend env vars in Vercel (same names as `backend/.env.example`):
   - `DATABASE_URL` — must be a **cloud MySQL** reachable from Vercel (not `localhost`).
   - `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `ALLOWED_EMAIL_DOMAIN`, Google Drive / AI keys as needed.
   - `MEDIA_STORAGE=google` (local `uploads/` does not persist on serverless).
   - `PUBLIC_API_BASE_URL=https://YOUR-PROJECT.vercel.app`
3. Set client env:
   - `EXPO_PUBLIC_API_BASE_URL=https://YOUR-PROJECT.vercel.app`
4. After first deploy, run migrations/seed against the cloud DB from your machine (`cd backend && npm run db:push && npm run db:seed`).
5. Add the Vercel URL to Google OAuth **Authorized JavaScript origins**.

Local check before deploy: `npm run vercel-build` (from repo root).

CLI: `npx vercel` (preview) or `npx vercel --prod`.

## Cloud Test Builds (EAS)

In `mobile`:

- Android test build (APK): `npm run build:android`
- iOS test build: `npm run build:ios`

Requirements:

- Expo account login (`npx eas login`) or `EXPO_TOKEN`
- Apple Developer account for iOS signing
- Google Play keystore handling (EAS can manage automatically)

## API Endpoints

- `POST /api/auth/google`
- `GET /api/auth/me`
- `GET /api/types`
- `POST /api/types` (admin only)
- `GET /api/events`
- `GET /api/events/grouped`
- `POST /api/events` (multipart form with `media`)

## Notes

- Database is SQL-backed via Prisma.
- Media uploads go directly to Google Drive.
- Access is restricted by `ALLOWED_EMAIL_DOMAIN`.
