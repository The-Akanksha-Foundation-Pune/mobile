require("dotenv").config();
const { fetchFinanceCostCenterRows } = require("../services/financeCostCenter");
const prisma = require("../lib/prisma");

async function main() {
  const { map, rows } = await fetchFinanceCostCenterRows();
  const cities = await prisma.city.findMany();

  console.log("Finance table:", process.env.FINANCE_COSTCENTER_TABLE || "Finance.costcenter");
  console.log("Detected columns:", map);
  console.log("Finance rows:", rows.length);
  console.log("App cities:", cities.map((c) => c.name).join(", "));

  const sample = rows.slice(0, 10).map((row) => ({
    code: map.code ? row[map.code] : null,
    name: map.name ? row[map.name] : null,
    city: map.city ? row[map.city] : null,
  }));
  console.log("Sample finance rows:", JSON.stringify(sample, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
