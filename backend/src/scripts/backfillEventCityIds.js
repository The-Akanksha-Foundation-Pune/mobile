const prisma = require("../lib/prisma");

async function main() {
  const events = await prisma.event.findMany({
    where: { cityId: null, costCenterId: { not: null } },
    include: { costCenter: true },
  });

  let updated = 0;
  for (const event of events) {
    if (!event.costCenter?.cityId) {
      continue;
    }
    await prisma.event.update({
      where: { id: event.id },
      data: { cityId: event.costCenter.cityId },
    });
    updated += 1;
  }

  console.log(`Backfilled cityId on ${updated} event(s).`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
