const prisma = require("../lib/prisma");

async function main() {
  const seedTypes = ["Workshop", "Donation Drive", "Medical Camp"];

  for (const name of seedTypes) {
    const exists = await prisma.eventType.findFirst({ where: { name } });
    if (!exists) {
      await prisma.eventType.create({ data: { name } });
    }
  }

  console.log("Seed completed.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
