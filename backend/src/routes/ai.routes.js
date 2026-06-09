const express = require("express");
const { z } = require("zod");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const polishSchema = z.object({
  description: z.string().min(1),
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

function getGeminiModels() {
  const configured = process.env.GOOGLE_AI_MODEL?.trim();
  if (configured) {
    return [configured, "gemini-2.0-flash", "gemini-2.5-flash"];
  }
  return ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-2.5-pro"];
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

    if (response.status === 429) {
      const retryAfterSeconds = Number(response.headers.get("Retry-After"));
      const waitSeconds = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0 ? retryAfterSeconds : 20;
      const error = new Error(`Google AI rate limit reached. Try again in about ${waitSeconds} seconds.`);
      error.statusCode = 429;
      throw error;
    }

    const message = data?.error?.message || rawBody || "Failed to polish description.";
    if (response.status !== 404) {
      const error = new Error(message);
      error.statusCode = response.status;
      throw error;
    }
    lastError = message;
  }

  const error = new Error(lastError);
  error.statusCode = 502;
  throw error;
}

router.post("/polish-description", requireAuth, async (req, res) => {
  const parsed = polishSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: "Description is required." });
  }

  const { description, title, cityName, costCenterName, costCenterCode, eventTypeName, location, eventDate } =
    parsed.data;

  const context = {
    title: title?.trim(),
    cityName: cityName?.trim(),
    costCenterName: costCenterName?.trim(),
    costCenterCode: costCenterCode?.trim(),
    eventTypeName: eventTypeName?.trim(),
    location: location?.trim(),
    eventDate: eventDate?.trim(),
  };

  try {
    const polished = await callGeminiPolish(description.trim(), context);
    return res.json({ polished });
  } catch (error) {
    const statusCode = Number(error?.statusCode) || 500;
    if (statusCode === 429) {
      const polished = fallbackPolish(description);
      return res.json({
        polished,
        fallback: true,
        message: "Google AI was rate-limited, so local polish fallback was used.",
      });
    }
    console.error("AI polish error:", error);
    return res.status(statusCode).json({ message: String(error?.message || "Failed to polish description.") });
  }
});

module.exports = router;
