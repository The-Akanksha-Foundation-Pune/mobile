const prisma = require("../lib/prisma");

const TABLE = process.env.FINANCE_COSTCENTER_TABLE || "Finance.costcenter";

const COL_ID = process.env.FINANCE_CC_COL_ID;
const COL_CODE = process.env.FINANCE_CC_COL_CODE;
const COL_NAME = process.env.FINANCE_CC_COL_NAME;
const COL_CITY = process.env.FINANCE_CC_COL_CITY;

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function normalizeCityLabel(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function pickColumn(columns, preferred, matchers) {
  if (preferred) {
    const hit = columns.find((c) => normalizeKey(c) === normalizeKey(preferred));
    if (hit) return hit;
  }
  for (const matcher of matchers) {
    const hit = columns.find((c) => matcher.test(c));
    if (hit) return hit;
  }
  return null;
}

async function loadFinanceColumnMap() {
  const rows = await prisma.$queryRawUnsafe(`SHOW COLUMNS FROM ${TABLE}`);
  const columns = rows.map((row) => row.Field);

  return {
    columns,
    id: pickColumn(columns, COL_ID, [/^id$/i, /costcenterid/i, /^ccid$/i]),
    code: pickColumn(columns, COL_CODE, [/costcentercode/i, /^code$/i, /^cccode$/i]),
    name: pickColumn(columns, COL_NAME, [/^costcenter$/i, /costcentername/i, /^name$/i, /^description$/i]),
    city: pickColumn(columns, COL_CITY, [/cityname/i, /^city$/i, /locationcity/i, /town/i]),
    isActive: pickColumn(columns, null, [/^is_active$/i, /^active$/i, /^isactive$/i]),
  };
}

function readFinanceValue(row, column) {
  if (!column) return "";
  const value = row[column];
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function resolveCity(cities, financeCityValue) {
  const needle = normalizeCityLabel(financeCityValue);
  if (!needle) return null;

  const exact = cities.find((city) => normalizeCityLabel(city.name) === needle);
  if (exact) return exact;

  const contains = cities.find((city) => {
    const cityName = normalizeCityLabel(city.name);
    return needle.includes(cityName) || cityName.includes(needle);
  });
  if (contains) return contains;

  const aliasMap = {
    "delhi ncr": "delhi ncr",
    "new delhi": "delhi ncr",
    delhi: "delhi ncr",
    bengaluru: "bengaluru",
    bangalore: "bengaluru",
    bombay: "mumbai",
  };
  const mapped = aliasMap[needle];
  if (mapped) {
    return cities.find((city) => normalizeCityLabel(city.name) === mapped) || null;
  }

  return null;
}

async function fetchFinanceCostCenterRows() {
  const map = await loadFinanceColumnMap();
  if (!map.name && !map.code) {
    throw new Error(
      `Could not detect name column on ${TABLE}. Set FINANCE_CC_COL_NAME=costcenter in .env.`
    );
  }
  if (!map.city) {
    throw new Error(
      `Could not detect city column on ${TABLE}. Set FINANCE_CC_COL_CITY in .env.`
    );
  }

  const rows = await prisma.$queryRawUnsafe(`SELECT * FROM ${TABLE}`);
  return { map, rows };
}

function isFinanceRowActive(row, map) {
  if (!map.isActive) return true;
  const value = row[map.isActive];
  return value === 1 || value === true || String(value).toLowerCase() === "true" || value === "1";
}

/**
 * Loads Finance.costcenter rows, keeps only rows with a city that exists in City table,
 * and upserts local CostCenter records linked by financeId.
 */
async function syncCostCentersFromFinance() {
  const { map, rows } = await fetchFinanceCostCenterRows();
  const cities = await prisma.city.findMany({ where: { isActive: true } });

  const synced = [];
  const skipped = [];

  for (const row of rows) {
    if (!isFinanceRowActive(row, map)) {
      skipped.push({ reason: "inactive", id: row[map.id] });
      continue;
    }

    const financeId = readFinanceValue(row, map.id) || readFinanceValue(row, map.code);
    const name = readFinanceValue(row, map.name) || readFinanceValue(row, map.code);
    const code =
      readFinanceValue(row, map.code) ||
      (financeId ? `CC-${financeId}` : name.toUpperCase().replace(/[^A-Z0-9]+/g, "-").slice(0, 40));
    const financeCity = readFinanceValue(row, map.city);

    if (!name) {
      skipped.push({ reason: "missing_name", code, name });
      continue;
    }

    if (!financeCity) {
      skipped.push({ reason: "no_city_assigned", code, name });
      continue;
    }

    const city = resolveCity(cities, financeCity);
    if (!city) {
      skipped.push({ reason: "city_not_in_app", code, name, financeCity });
      continue;
    }

    const financeKey = financeId || code;
    const existing =
      (await prisma.costCenter.findFirst({ where: { financeId: financeKey } })) ||
      (await prisma.costCenter.findFirst({ where: { code: code.toUpperCase() } }));

    const record = existing
      ? await prisma.costCenter.update({
          where: { id: existing.id },
          data: {
            financeId: financeKey,
            code: code.toUpperCase(),
            name,
            cityId: city.id,
            isActive: true,
          },
          include: { city: true, _count: { select: { donors: true } } },
        })
      : await prisma.costCenter.create({
          data: {
            financeId: financeKey,
            code: code.toUpperCase(),
            name,
            cityId: city.id,
            isActive: true,
          },
          include: { city: true, _count: { select: { donors: true } } },
        });

    synced.push(record);
  }

  return { synced, skipped, columnMap: map };
}

function serializeCostCenter(item) {
  return {
    id: item.id,
    financeId: item.financeId || "",
    code: item.code,
    name: item.name,
    description: item.description || "",
    cityId: item.cityId,
    cityName: item.city?.name || "",
    sortOrder: item.sortOrder,
    isActive: item.isActive,
    donorCount: item._count?.donors ?? 0,
  };
}

module.exports = {
  syncCostCentersFromFinance,
  serializeCostCenter,
  fetchFinanceCostCenterRows,
};
