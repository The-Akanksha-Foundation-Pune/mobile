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
   - Physical device / EAS APK: `EXPO_PUBLIC_API_BASE_URL=http://YOUR_LAN_IP:4000` (not `127.0.0.1`)
   - Run `cd client && npm run api:setup` for your LAN IP and full steps
   - Verify on phone browser: `http://YOUR_LAN_IP:4000/health` must return `{"ok":true,...}` before rebuilding
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
