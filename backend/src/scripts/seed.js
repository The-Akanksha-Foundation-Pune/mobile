const prisma = require("../lib/prisma");

async function main() {
  const seedTypes = ["Workshop", "Donation Drive", "Medical Camp"];
  const seedCities = [
    { name: "Mumbai", state: "Maharashtra", sortOrder: 1 },
    { name: "Delhi NCR", state: "Delhi", sortOrder: 2 },
    { name: "Bengaluru", state: "Karnataka", sortOrder: 3 },
    { name: "Hyderabad", state: "Telangana", sortOrder: 4 },
    { name: "Chennai", state: "Tamil Nadu", sortOrder: 5 },
    { name: "Pune", state: "Maharashtra", sortOrder: 6 },
  ];

  for (const name of seedTypes) {
    const exists = await prisma.eventType.findFirst({ where: { name } });
    if (!exists) {
      await prisma.eventType.create({ data: { name } });
    }
  }

  const cityByName = {};
  for (const city of seedCities) {
    const row =
      (await prisma.city.findFirst({ where: { name: city.name } })) ||
      (await prisma.city.create({ data: city }));
    cityByName[city.name] = row;
  }

  console.log("Base seed completed (types, cities).");
  console.log("Run npm run db:seed:dummy to load preview events, cost centers, calendar, and donors.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
