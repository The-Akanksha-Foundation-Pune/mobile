/**
 * Seeds LocalDB preview events/calendar/donors against cost centers synced from Finance.costcenter.
 * Run: npm run db:seed:dummy
 */
const prisma = require("../lib/prisma");
const { syncCostCentersFromFinance } = require("../services/financeCostCenter");

const SEED_USER_EMAIL = "seed.volunteer@akanksha.org";
const DUMMY_PREFIX = "dummy-seed";

function photo(seed) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/640/480`;
}

function normalizeCostCenterKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

const EVENT_TYPES = ["Workshop", "Donation Drive", "Medical Camp"];

const CITIES = [
  { name: "Mumbai", state: "Maharashtra", sortOrder: 1 },
  { name: "Delhi NCR", state: "Delhi", sortOrder: 2 },
  { name: "Bengaluru", state: "Karnataka", sortOrder: 3 },
  { name: "Hyderabad", state: "Telangana", sortOrder: 4 },
  { name: "Chennai", state: "Tamil Nadu", sortOrder: 5 },
  { name: "Pune", state: "Maharashtra", sortOrder: 6 },
  { name: "Nagpur", state: "Maharashtra", sortOrder: 7 },
];

/** Donors keyed by Finance `costcenter` name (must exist after sync). */
const DONORS_BY_COST_CENTER = {
  "ASE Mumbai": [
    { email: "mumbai.donor1@example.com", name: "Mumbai Donor One" },
    { email: "mumbai.donor2@example.com", name: "Mumbai Donor Two" },
  ],
  ANWEMS: [{ email: "pune.donor1@example.com", name: "Pune Donor One" }],
  "Coaches - Pune": [{ email: "coaches.pune.donor@example.com", name: "Coaches Pune Donor" }],
  "Community Engagement Mumbai": [
    { email: "fundraising.donor@example.com", name: "National Fundraising Donor" },
  ],
};

const EVENTS = [
  {
    key: "ongoing-mum-1",
    costCenter: "ASE Mumbai",
    title: "Community Health Camp — Day 2",
    caption: "Free screenings at the community hall.",
    eventDate: "2026-05-21",
    location: "Mumbai Community Hall",
    eventTypeName: "Medical Camp",
    eventStatus: "ongoing",
    mediaSeed: "mum-ongoing-1",
  },
  {
    key: "ongoing-del-1",
    costCenter: "ANWEMS",
    title: "Delhi Summer Reading Club",
    caption: "Daily reading sessions for primary students.",
    eventDate: "2026-05-21",
    location: "Akanksha Learning Centre, Delhi NCR",
    eventTypeName: "Workshop",
    eventStatus: "ongoing",
    mediaSeed: "del-ongoing-1",
  },
  {
    key: "ongoing-blr-1",
    costCenter: "Coaches - Pune",
    title: "STEM Lab Open Day",
    caption: "Robotics and coding demos for learners.",
    eventDate: "2026-05-20",
    location: "Bengaluru Learning Centre",
    eventTypeName: "Workshop",
    eventStatus: "ongoing",
    mediaSeed: "blr-ongoing-1",
  },
  {
    key: "ongoing-fnd-1",
    costCenter: "Community Engagement Mumbai",
    title: "Donor Site Visit — Mumbai Schools",
    caption: "Donors touring program impact locations.",
    eventDate: "2026-05-20",
    location: "Mumbai — School cluster A",
    eventTypeName: "Donation Drive",
    eventStatus: "ongoing",
    mediaSeed: "fnd-ongoing-1",
  },
  {
    key: "upcoming-mum-1",
    costCenter: "ASE Mumbai",
    title: "Mumbai Fundraiser Evening",
    caption: "Annual gala with student performances.",
    eventDate: "2026-05-28",
    location: "Mumbai Central Auditorium",
    eventTypeName: "Donation Drive",
    eventStatus: "upcoming",
    mediaSeed: "mum-up-1",
  },
  {
    key: "upcoming-del-1",
    costCenter: "ANWEMS",
    title: "Delhi Parent Open House",
    caption: "Progress reviews with families.",
    eventDate: "2026-06-08",
    location: "Delhi NCR Learning Centre",
    eventTypeName: "Workshop",
    eventStatus: "upcoming",
    mediaSeed: "del-up-1",
  },
  {
    key: "upcoming-blr-1",
    costCenter: "Coaches - Pune",
    title: "Bengaluru Robotics Bootcamp",
    caption: "Three-day STEM bootcamp.",
    eventDate: "2026-06-02",
    location: "Bengaluru Learning Centre",
    eventTypeName: "Workshop",
    eventStatus: "upcoming",
    mediaSeed: "blr-up-1",
  },
  {
    key: "upcoming-fnd-1",
    costCenter: "Community Engagement Mumbai",
    title: "National Donor Roundtable",
    caption: "Quarterly briefing for cost-center donors.",
    eventDate: "2026-06-14",
    location: "Virtual + Mumbai HQ",
    eventTypeName: "Donation Drive",
    eventStatus: "upcoming",
    mediaSeed: "fnd-up-1",
  },
  {
    key: "gallery-mum-1",
    costCenter: "ASE Mumbai",
    title: "Health Camp Wrap-up",
    caption: "200+ families served at the community hall.",
    eventDate: "2026-05-18",
    location: "Mumbai Community Hall",
    eventTypeName: "Medical Camp",
    eventStatus: "complete",
    approvedForGallery: true,
    mediaSeed: "mum-gal-1",
  },
  {
    key: "gallery-mum-2",
    costCenter: "ASE Mumbai",
    title: "School Kit Distribution",
    caption: "Stationery for the new term.",
    eventDate: "2026-05-18",
    location: "Akanksha Learning Centre, Mumbai",
    eventTypeName: "Donation Drive",
    eventStatus: "complete",
    approvedForGallery: true,
    mediaSeed: "mum-gal-2",
  },
  {
    key: "gallery-mum-3",
    costCenter: "ASE Mumbai",
    title: "Sports Day Finals",
    caption: "Inter-centre athletics at municipal ground.",
    eventDate: "2026-05-10",
    location: "Mumbai Municipal Sports Ground",
    eventTypeName: "Workshop",
    eventStatus: "complete",
    approvedForGallery: true,
    mediaSeed: "mum-gal-3",
  },
  {
    key: "gallery-del-1",
    costCenter: "ANWEMS",
    title: "Delhi Workshop Showcase",
    caption: "Student science fair highlights.",
    eventDate: "2026-05-15",
    location: "Delhi NCR Learning Centre",
    eventTypeName: "Workshop",
    eventStatus: "complete",
    approvedForGallery: true,
    mediaSeed: "del-gal-1",
  },
  {
    key: "gallery-blr-1",
    costCenter: "Coaches - Pune",
    title: "Food Drive Completion",
    caption: "Ration kits delivered with NGO partners.",
    eventDate: "2026-05-15",
    location: "Bengaluru West Hub",
    eventTypeName: "Donation Drive",
    eventStatus: "complete",
    approvedForGallery: true,
    mediaSeed: "blr-gal-1",
  },
];

const CALENDAR_ENTRIES = [
  {
    key: "cal-mum-1",
    costCenter: "ASE Mumbai",
    title: "Health Camp — Day 2",
    description: "Ongoing medical camp.",
    eventDate: "2026-05-21",
    location: "Mumbai Community Hall",
  },
  {
    key: "cal-mum-2",
    costCenter: "ASE Mumbai",
    title: "Fundraiser Evening",
    description: "Upcoming donor gala.",
    eventDate: "2026-05-28",
    location: "Mumbai Central Auditorium",
  },
  {
    key: "cal-del-1",
    costCenter: "ANWEMS",
    title: "Summer Reading Club",
    description: "Daily sessions.",
    eventDate: "2026-05-21",
    location: "Delhi NCR Learning Centre",
  },
  {
    key: "cal-blr-1",
    costCenter: "Coaches - Pune",
    title: "STEM Lab Open Day",
    description: "Robotics demos.",
    eventDate: "2026-05-20",
    location: "Bengaluru Learning Centre",
  },
  {
    key: "cal-fnd-1",
    costCenter: "Community Engagement Mumbai",
    title: "Donor Site Visit",
    description: "Donor tour of schools.",
    eventDate: "2026-05-20",
    location: "Mumbai — School cluster A",
  },
  {
    key: "cal-mum-3",
    costCenter: "ASE Mumbai",
    title: "Health Camp Archive",
    description: "Completed camp — gallery available.",
    eventDate: "2026-05-18",
    location: "Mumbai Community Hall",
  },
];

async function ensureSeedUser() {
  const existing = await prisma.user.findUnique({ where: { email: SEED_USER_EMAIL } });
  if (existing) return existing;
  return prisma.user.create({
    data: {
      email: SEED_USER_EMAIL,
      name: "Seed Volunteer",
      role: "volunteer",
      googleSub: `${DUMMY_PREFIX}:volunteer`,
    },
  });
}

async function upsertCities() {
  const map = {};
  for (const city of CITIES) {
    const row =
      (await prisma.city.findFirst({ where: { name: city.name } })) ||
      (await prisma.city.create({ data: city }));
    map[city.name] = row;
  }
  return map;
}

async function upsertEventTypes() {
  const map = {};
  for (const name of EVENT_TYPES) {
    const row =
      (await prisma.eventType.findFirst({ where: { name } })) ||
      (await prisma.eventType.create({ data: { name } }));
    map[name] = row;
  }
  return map;
}

function buildCostCenterLookup(synced) {
  const byName = {};
  for (const center of synced) {
    byName[normalizeCostCenterKey(center.name)] = center;
  }
  return {
    get(costCenterName) {
      return byName[normalizeCostCenterKey(costCenterName)] || null;
    },
    all() {
      return synced;
    },
  };
}

async function seedDonors(ccLookup) {
  let count = 0;
  for (const [costCenterName, donors] of Object.entries(DONORS_BY_COST_CENTER)) {
    const center = ccLookup.get(costCenterName);
    if (!center) {
      console.warn(`  Skip donors — cost center not in Finance sync: ${costCenterName}`);
      continue;
    }
    for (const donor of donors) {
      const exists = await prisma.donor.findFirst({
        where: { email: donor.email, costCenterId: center.id },
      });
      if (!exists) {
        await prisma.donor.create({
          data: { email: donor.email, name: donor.name, costCenterId: center.id },
        });
        count += 1;
      }
    }
  }
  return count;
}

async function upsertEvents({ user, typeByName, ccLookup }) {
  let count = 0;
  const skipped = [];
  for (const event of EVENTS) {
    const center = ccLookup.get(event.costCenter);
    const type = typeByName[event.eventTypeName];
    if (!center) {
      skipped.push(event.costCenter);
      continue;
    }
    if (!type) continue;

    const mediaDriveFileId = `${DUMMY_PREFIX}:event:${event.key}`;
    const existing = await prisma.event.findFirst({ where: { mediaDriveFileId } });

    const data = {
      title: event.title,
      caption: event.caption,
      eventDate: new Date(`${event.eventDate}T00:00:00.000Z`),
      location: event.location,
      eventStatus: event.eventStatus,
      approvedForGallery: Boolean(event.approvedForGallery),
      mediaType: event.mediaType || "photo",
      mediaUrl: photo(event.mediaSeed),
      mediaDriveFileId,
      originalName: `${event.mediaSeed}.jpg`,
      uploadedByName: "Akanksha Volunteer",
      typeId: type.id,
      costCenterId: center.id,
      cityId: center.cityId,
      uploadedById: user.id,
    };

    if (existing) {
      await prisma.event.update({ where: { id: existing.id }, data });
    } else {
      await prisma.event.create({ data });
    }
    count += 1;
  }
  if (skipped.length) {
    const unique = [...new Set(skipped)];
    console.warn(`  Skipped events — Finance cost center not synced: ${unique.join(", ")}`);
  }
  return count;
}

async function upsertCalendar(ccLookup) {
  let count = 0;
  const skipped = [];
  for (const entry of CALENDAR_ENTRIES) {
    const center = ccLookup.get(entry.costCenter);
    if (!center) {
      skipped.push(entry.costCenter);
      continue;
    }

    const existing = await prisma.calendarEntry.findFirst({
      where: {
        title: entry.title,
        costCenterId: center.id,
        eventDate: new Date(`${entry.eventDate}T00:00:00.000Z`),
      },
    });

    const data = {
      title: entry.title,
      description: entry.description,
      eventDate: new Date(`${entry.eventDate}T00:00:00.000Z`),
      endDate: entry.endDate ? new Date(`${entry.endDate}T00:00:00.000Z`) : null,
      location: entry.location,
      costCenterId: center.id,
      cityId: center.cityId,
      isPublished: true,
    };

    if (existing) {
      await prisma.calendarEntry.update({ where: { id: existing.id }, data });
    } else {
      await prisma.calendarEntry.create({ data });
    }
    count += 1;
  }
  if (skipped.length) {
    const unique = [...new Set(skipped)];
    console.warn(`  Skipped calendar — Finance cost center not synced: ${unique.join(", ")}`);
  }
  return count;
}

async function main() {
  const user = await ensureSeedUser();
  const cityByName = await upsertCities();
  const typeByName = await upsertEventTypes();

  console.log("Syncing cost centers from Finance.costcenter...");
  const { synced, skipped } = await syncCostCentersFromFinance();
  const ccLookup = buildCostCenterLookup(synced);

  const donorCount = await seedDonors(ccLookup);
  const eventCount = await upsertEvents({ user, typeByName, ccLookup });
  const calendarCount = await upsertCalendar(ccLookup);

  console.log("Dummy seed completed:");
  console.log(`  Cities: ${Object.keys(cityByName).length}`);
  console.log(`  Event types: ${Object.keys(typeByName).length}`);
  console.log(`  Cost centers (Finance sync): ${synced.length} synced, ${skipped.length} skipped`);
  console.log(`  Donors added: ${donorCount}`);
  console.log(`  Events: ${eventCount}`);
  console.log(`  Calendar entries: ${calendarCount}`);
  console.log(`  Seed user: ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
