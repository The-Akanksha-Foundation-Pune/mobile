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

1. Go to mobile folder:
   - `cd mobile`
2. Update API URL in `App.tsx`:
   - Set `API_BASE_URL` to your machine IP, for example `http://192.168.1.10:4000`
3. Configure Google OAuth client IDs in `App.tsx`:
   - `GOOGLE_WEB_CLIENT_ID`
   - `GOOGLE_ANDROID_CLIENT_ID`
   - `GOOGLE_IOS_CLIENT_ID`
4. Start app:
   - `npm start`
5. Run on device/emulator:
   - Android: `npm run android`
   - iOS: `npm run ios`

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
