#!/usr/bin/env node
/**
 * Prints Google Web OAuth values for Vercel-hosted sign-in.
 * Run: node scripts/print-web-oauth-setup.mjs
 */

const WEB_CLIENT_ID =
  process.env.GOOGLE_WEB_CLIENT_ID ||
  "629988134724-s7cbp9062fhs3s34hdrmcke2kktjc5p3.apps.googleusercontent.com";

const hosts = [
  process.env.EXPO_PUBLIC_WEB_REDIRECT_URI,
  "https://mobile-sand-chi.vercel.app",
  "https://mobile-git-main-akanksha-dev-teams-projects.vercel.app",
].filter(Boolean);

const uniqueHosts = [...new Set(hosts)];

console.log(`
Google Web OAuth setup (Vercel hosted app)
==========================================

1) Open Google Cloud Console → APIs & Services → Credentials:
   https://console.cloud.google.com/apis/credentials

2) Edit the **Web application** OAuth client:
   Client ID: ${WEB_CLIENT_ID}

3) Authorized JavaScript origins — add each:
${uniqueHosts.map((url) => `   - ${url}`).join("\n")}

4) Authorized redirect URIs — add each (exact match, no trailing slash):
${uniqueHosts.map((url) => `   - ${url}`).join("\n")}

5) In Vercel → Environment Variables (client project), set:
   EXPO_PUBLIC_API_BASE_URL=https://mobile-sand-chi.vercel.app
   EXPO_PUBLIC_WEB_REDIRECT_URI=https://mobile-sand-chi.vercel.app

6) Redeploy Vercel after env changes.

Sign-in only works for @akanksha.org Google accounts.
`);
