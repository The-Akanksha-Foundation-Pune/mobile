export const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || "http://127.0.0.1:4000";

export const GOOGLE_WEB_CLIENT_ID =
  "629988134724-s7cbp9062fhs3s34hdrmcke2kktjc5p3.apps.googleusercontent.com";
export const GOOGLE_EXPO_CLIENT_ID = GOOGLE_WEB_CLIENT_ID;
export const GOOGLE_ANDROID_CLIENT_ID =
  "629988134724-9obom6r0hf1vobci72grn67nmckoum42.apps.googleusercontent.com";
export const GOOGLE_IOS_CLIENT_ID =
  "629988134724-in93md8e8gk604t64gqc1m7sfva0dnaf.apps.googleusercontent.com";

/** Public privacy policy, published from site/ by the GitHub Pages workflow. */
export const PRIVACY_POLICY_URL = "https://the-akanksha-foundation-pune.github.io/mobile/privacy.html";

/**
 * Shows or hides the "Polish with AI" button on the post, story and event forms,
 * and the matching "AI polish" limit in the Admin console. Flip to true to bring it back;
 * the backend route and limit stay in place either way.
 */
export const AI_POLISH_ENABLED = false;
