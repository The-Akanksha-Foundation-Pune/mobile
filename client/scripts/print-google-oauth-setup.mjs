#!/usr/bin/env node
/**
 * Prints Google OAuth values to register in Google Cloud Console.
 * Run: npm run google:setup
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const clientRoot = join(__dirname, "..");

const appJson = JSON.parse(readFileSync(join(clientRoot, "app.json"), "utf8"));
const packageName = appJson.expo.android?.package ?? "org.akanksha.capture";

const plugin = appJson.expo.plugins?.find(
  (entry) => Array.isArray(entry) && entry[0] === "@react-native-google-signin/google-signin"
);
const androidClientId = plugin?.[1]?.androidClientId ?? "(see app.json plugin block)";

const androidClientNumeric = String(androidClientId).replace(".apps.googleusercontent.com", "");
const redirectUri = `com.googleusercontent.apps.${androidClientNumeric}:/oauthredirect`;

function readDebugFingerprints() {
  try {
    const out = execSync(
      `keytool -list -v -keystore "$HOME/.android/debug.keystore" -alias androiddebugkey -storepass android -keypass android 2>/dev/null`,
      { encoding: "utf8", shell: "/bin/bash" }
    );
    const sha1 = out.match(/SHA1:\s*(.+)/)?.[1]?.trim();
    const sha256 = out.match(/SHA256:\s*(.+)/)?.[1]?.trim();
    return { sha1, sha256 };
  } catch {
    return { sha1: null, sha256: null };
  }
}

const debug = readDebugFingerprints();

// From EAS managed keystore (preview/production APK installs). Update if you rotate credentials.
const EAS_SHA1 = "4A:F0:C0:25:23:61:E5:A8:7F:DF:E9:CE:46:1F:1B:91:68:9A:80:F4";
const EAS_SHA256 =
  "E2:4E:CA:00:56:65:32:10:3D:4B:5F:1C:53:7C:9A:58:81:3D:5D:20:D5:B3:BD:33:0E:34:69:3A:BC:60:EF:FE";

console.log(`
Google OAuth setup for Capture Akanksha (Android DEVELOPER_ERROR fix)
=====================================================================

1) Open Google Cloud Console → APIs & Services → Credentials:
   https://console.cloud.google.com/apis/credentials

2) Edit the **Android** OAuth client:
   Client ID: ${androidClientId}
   Package name must be: ${packageName}

3) Add **both** SHA-1 fingerprints below (local debug + EAS APK builds):

   Local debug (npx expo run:android):
   SHA-1:   ${debug.sha1 ?? "(run: npx expo run:android first, then npm run google:setup)"}
   SHA-256: ${debug.sha256 ?? "(same as above)"}

   EAS preview/production APK (npm run build:android):
   SHA-1:   ${EAS_SHA1}
   SHA-256: ${EAS_SHA256}

   To refresh EAS values: cd client && npx eas credentials -p android

4) Optional — Web OAuth client redirect URI (only if using browser sign-in on Android):
   ${redirectUri}

5) Rebuild and reinstall the app after saving credentials (Google can take a few minutes):
   cd client && npx expo run:android
   — or —
   cd client && npm run build:android
`);
