/**
 * Normalize stored event mediaUrl values to /media/... paths so production
 * can rewrite them to PUBLIC_API_BASE_URL / EXPO_PUBLIC_API_BASE_URL.
 */
require("../lib/env");
const prisma = require("../lib/prisma");

function toRelativeMediaPath(mediaUrl) {
  if (!mediaUrl || mediaUrl.startsWith("/media/")) {
    return mediaUrl;
  }

  try {
    const parsed = new URL(mediaUrl);
    if (parsed.pathname.startsWith("/media/")) {
      return `${parsed.pathname}${parsed.search}`;
    }
  } catch (_error) {
    // keep as-is
  }

  const marker = "/media/";
  const index = mediaUrl.indexOf(marker);
  if (index >= 0) {
    return mediaUrl.slice(index);
  }

  return mediaUrl;
}

async function main() {
  const events = await prisma.event.findMany({
    select: { id: true, mediaUrl: true },
  });

  let updated = 0;
  for (const event of events) {
    const next = toRelativeMediaPath(event.mediaUrl);
    if (next !== event.mediaUrl) {
      await prisma.event.update({
        where: { id: event.id },
        data: { mediaUrl: next },
      });
      updated += 1;
    }
  }

  console.log(`Media URL backfill complete. Updated ${updated} of ${events.length} events.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
