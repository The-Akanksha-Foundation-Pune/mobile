const express = require("express");
const { z } = require("zod");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const polishSchema = z.object({
  description: z.string().min(1),
});

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

async function callGeminiPolish(description) {
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
            text: `Polish this event description in clear, concise, professional English. Keep the original meaning and facts. Return only the polished text.\n\nDescription:\n${description}`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.3,
      topP: 0.9,
      maxOutputTokens: 250,
    },
  };

  const models = ["gemini-2.5-flash", "gemini-2.5-pro"];
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

  try {
    const polished = await callGeminiPolish(parsed.data.description.trim());
    return res.json({ polished });
  } catch (error) {
    const statusCode = Number(error?.statusCode) || 500;
    if (statusCode === 429) {
      const polished = fallbackPolish(parsed.data.description);
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
