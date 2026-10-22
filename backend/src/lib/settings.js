const prisma = require("./prisma");

/**
 * Admin-editable limits. Stored in AppSetting; these are the defaults until an admin changes them.
 * - maxPostsPerUserPerEvent / maxStoriesPerUserPerEvent: how much one person may add to a single event.
 * - maxAiPolishPerDescription: how many times "Polish with AI" may run on one draft description (Gemini calls).
 */
const LIMIT_DEFAULTS = { maxPostsPerUserPerEvent: 5, maxStoriesPerUserPerEvent: 1, maxAiPolishPerDescription: 2 };

const KEY_BY_FIELD = {
  posts: "maxPostsPerUserPerEvent",
  stories: "maxStoriesPerUserPerEvent",
  polish: "maxAiPolishPerDescription",
};

async function getLimits() {
  const rows = await prisma.appSetting.findMany({ where: { key: { in: Object.keys(LIMIT_DEFAULTS) } } });
  const limits = { ...LIMIT_DEFAULTS };
  for (const row of rows) {
    const value = Number(row.value);
    if (Number.isInteger(value) && value >= 0) limits[row.key] = value;
  }
  return {
    posts: limits.maxPostsPerUserPerEvent,
    stories: limits.maxStoriesPerUserPerEvent,
    polish: limits.maxAiPolishPerDescription,
  };
}

/** Writes the limits that are provided; fields left undefined keep their current value. */
async function setLimits(next) {
  const writes = Object.entries(KEY_BY_FIELD)
    .filter(([field]) => next[field] !== undefined)
    .map(([field, key]) =>
      prisma.appSetting.upsert({ where: { key }, update: { value: String(next[field]) }, create: { key, value: String(next[field]) } })
    );
  if (writes.length > 0) await prisma.$transaction(writes);
  return getLimits();
}

module.exports = { LIMIT_DEFAULTS, getLimits, setLimits };
