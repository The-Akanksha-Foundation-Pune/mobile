const express = require("express");
const { z } = require("zod");
const { requireAuth } = require("../middleware/auth");
const prisma = require("../lib/prisma");
const { getLimits } = require("../lib/settings");

const router = express.Router();

/** Usage rows older than this are dropped; a draft never lives that long. */
const USAGE_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

const polishSchema = z.object({
  description: z.string().min(1),
  /** Client-minted id for the form being edited; the polish limit is counted against it. */
  draftId: z.string().min(8).max(80).optional(),
  kind: z.enum(["event", "post", "story"]).optional(),
  title: z.string().optional(),
  cityName: z.string().optional(),
  costCenterName: z.string().optional(),
  costCenterCode: z.string().optional(),
  eventTypeName: z.string().optional(),
  location: z.string().optional(),
  eventDate: z.string().optional(),
});

function buildPolishPrompt(description, context) {
  const contextLines = [
    context.title && `Event title: ${context.title}`,
    context.cityName && `City: ${context.cityName}`,
    context.costCenterName &&
      `Cost center: ${context.costCenterName}${context.costCenterCode ? ` (${context.costCenterCode})` : ""}`,
    context.eventTypeName && `Event type: ${context.eventTypeName}`,
    context.eventDate && `Event date: ${context.eventDate}`,
    context.location && `Location: ${context.location}`,
  ].filter(Boolean);

  const contextBlock =
    contextLines.length > 0
      ? `Use this event context when polishing. Keep names, places, and dates accurate.\n${contextLines.join("\n")}\n\n`
      : "";

  return `${contextBlock}Polish this event description in clear, concise, professional English for an Akanksha Foundation school event report. Keep the original meaning and facts. Return only the polished description text.\n\nDescription:\n${description}`;
}

/**
 * Models to try, in order. Google retires names over time (all gemini-2.x returned 404 "no longer
 * available to new users" in Oct 2026), so the loop below skips retired or tier-blocked models.
 * GOOGLE_AI_MODEL, when set, is tried first.
 */
const DEFAULT_GEMINI_MODELS = ["gemini-3.1-pro-preview", "gemini-3.8-flash", "gemini-3.5-flash-lite"];

function getGeminiModels() {
  const configured = process.env.GOOGLE_AI_MODEL?.trim();
  const models = configured ? [configured, ...DEFAULT_GEMINI_MODELS] : DEFAULT_GEMINI_MODELS;
  return [...new Set(models)];
}

/** 429 whose quota line says "limit: 0" means the model is not on this key's tier at all, not a burst. */
function isTierBlocked(message) {
  return /limit:\s*0\b/.test(String(message || ""));
}

function fallbackPolish(description) {
  const cleaned = description.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return "";
  }

  // Simple local fallback when upstream AI is rate-limited.
  const sentences = cleaned
    .split(/([.!?]\s+)/)
    .reduce((acc, part) => {
      if (!part) return acc;
      if (/^[.!?]\s+$/.test(part) && acc.length > 0) {
        acc[acc.length - 1] += part;
      } else {
        acc.push(part);
      }
      return acc;
    }, [])
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1));

  const rebuilt = sentences.join(" ").replace(/\s+([,.!?;:])/g, "$1").trim();
  return /[.!?]$/.test(rebuilt) ? rebuilt : `${rebuilt}.`;
}

function parseJsonSafely(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function callGeminiPolish(description, context = {}) {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    const error = new Error("GOOGLE_AI_API_KEY is not configured on the backend.");
    error.statusCode = 500;
    throw error;
  }

  const body = {
    contents: [
      {
        parts: [
          {
            text: buildPolishPrompt(description, context),
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      topP: 0.9,
      maxOutputTokens: 400,
    },
  };

  const models = getGeminiModels();
  let lastError = "Failed to polish description.";
  let rateLimited = null;

  for (const model of models) {
    let response;
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
    } catch (networkError) {
      const error = new Error(
        `Unable to reach Google AI service (${String(networkError?.message || "network error")}).`
      );
      error.statusCode = 503;
      throw error;
    }

    const rawBody = await response.text();
    const data = parseJsonSafely(rawBody);
    if (response.ok) {
      const polished = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (polished) {
        return polished;
      }
      lastError = "No polished text was returned.";
      continue;
    }

    const message = data?.error?.message || rawBody || "Failed to polish description.";

    if (response.status === 402) {
      // Prepaid credit on the AI Studio project is gone; every model will say the same, so stop here.
      const error = new Error(
        "Google AI credits for this app are used up. Ask a Super Admin to top up the AI Studio project; until then descriptions are tidied without AI."
      );
      error.statusCode = 402;
      throw error;
    }

    if (response.status === 429) {
      if (isTierBlocked(message)) {
        // e.g. gemini-3.1-pro on the free tier: not a burst, so move on to the next model.
        console.warn(`Gemini model ${model} is not available on this key's tier; trying the next model.`);
        lastError = message;
        continue;
      }
      const retryAfterSeconds = Number(response.headers.get("Retry-After"));
      const waitSeconds = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds : 20;
      rateLimited = rateLimited || `Google AI rate limit reached. Try again in about ${waitSeconds} seconds.`;
      lastError = message;
      continue;
    }

    if (response.status === 404) {
      // Retired model name. Google's message names the replacement; log it so the list can be updated.
      console.warn(`Gemini model ${model} is unavailable: ${message}`);
      lastError = message;
      continue;
    }

    const error = new Error(message);
    error.statusCode = response.status;
    throw error;
  }

  if (rateLimited) {
    const error = new Error(rateLimited);
    error.statusCode = 429;
    throw error;
  }

  console.error("No Gemini model in the list could be used:", lastError);
  const error = new Error(
    "None of the configured Google AI models are available for this key. Set GOOGLE_AI_MODEL on the backend to a current model."
  );
  error.statusCode = 502;
  throw error;
}

function polishNoun(kind) {
  return kind === "story" ? "story" : kind === "event" ? "event" : "post";
}

/**
 * Looks up how many polishes this user has already spent on the draft.
 * Returns { limit, used, remaining }. Without a draftId nothing is tracked and the request is unlimited
 * (kept so older clients still work); the client always sends one.
 */
async function getPolishUsage(userId, draftId) {
  const limits = await getLimits();
  const limit = limits.polish;
  if (!draftId) {
    return { limit, used: 0, remaining: limit, tracked: false };
  }
  const row = await prisma.aiPolishUsage.findUnique({ where: { userId_draftId: { userId, draftId } } });
  const used = row?.count ?? 0;
  return { limit, used, remaining: Math.max(0, limit - used), tracked: true };
}

async function recordPolishUse(userId, draftId, kind) {
  await prisma.aiPolishUsage.upsert({
    where: { userId_draftId: { userId, draftId } },
    update: { count: { increment: 1 } },
    create: { userId, draftId, kind: kind || "post", count: 1 },
  });
  // Opportunistic cleanup so the table does not grow forever.
  await prisma.aiPolishUsage
    .deleteMany({ where: { updatedAt: { lt: new Date(Date.now() - USAGE_RETENTION_MS) } } })
    .catch(() => undefined);
}

router.post("/polish-description", requireAuth, async (req, res) => {
  const parsed = polishSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Description is required." });
  }

  const { description, draftId, kind, title, cityName, costCenterName, costCenterCode, eventTypeName, location, eventDate } =
    parsed.data;

  const usage = await getPolishUsage(req.user.id, draftId);
  if (usage.tracked && usage.remaining <= 0) {
    return res.status(403).json({
      code: "polish_limit",
      message:
        usage.limit === 0
          ? "Polish with AI is turned off right now."
          : `You've used all ${usage.limit} AI ${usage.limit === 1 ? "polish" : "polishes"} for this ${polishNoun(kind)}. Edit the text yourself to finish it.`,
      limit: usage.limit,
      remaining: 0,
    });
  }

  const context = {
    title: title?.trim(),
    cityName: cityName?.trim(),
    costCenterName: costCenterName?.trim(),
    costCenterCode: costCenterCode?.trim(),
    eventTypeName: eventTypeName?.trim(),
    location: location?.trim(),
    eventDate: eventDate?.trim(),
  };

  /** A chance is spent only when Gemini actually returned polished text. The local fallback is free. */
  async function spend() {
    if (!usage.tracked) return { limit: usage.limit, remaining: null };
    await recordPolishUse(req.user.id, draftId, kind);
    return { limit: usage.limit, remaining: Math.max(0, usage.remaining - 1) };
  }

  try {
    const polished = await callGeminiPolish(description.trim(), context);
    const spent = await spend();
    return res.json({ polished, ...spent });
  } catch (error) {
    const statusCode = Number(error?.statusCode) || 500;
    if (statusCode === 429 || statusCode === 402) {
      // Gemini is unavailable for a billing or quota reason: hand back a local tidy-up and keep the user's chances.
      const polished = fallbackPolish(description);
      return res.json({
        polished,
        limit: usage.limit,
        remaining: usage.tracked ? usage.remaining : null,
        fallback: true,
        message:
          statusCode === 402
            ? String(error.message)
            : "Google AI is busy right now, so the text was tidied without AI. This did not use one of your polishes.",
      });
    }
    console.error("AI polish error:", error);
    return res.status(statusCode).json({ message: String(error?.message || "Failed to polish description.") });
  }
});

module.exports = router;
