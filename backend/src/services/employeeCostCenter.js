const prisma = require("../lib/prisma");

// AFDW.employees has no cost centre table of its own: each employee row carries the full
// cost centre path as text, e.g. "Projects : Schools : Pune : MEMS". The distinct paths
// become the app's CostCenter rows, keyed by financeId = the normalised path.
const AFDW_DB = process.env.AFDW_DB_NAME || "AFDW";
const EMPLOYEES = `\`${AFDW_DB}\`.\`${process.env.AFDW_EMPLOYEES_TABLE || "employees"}\``;

const PLACEHOLDERS = new Set(["", "unknown", "na", "n/a", "tbd", "null", "-"]);

/** "Project: Schools: Nagpur : X" -> "Project : Schools : Nagpur : X"; placeholders -> "". */
function normalizePath(value) {
  const parts = String(value || "")
    .split(":")
    .map((part) => part.trim().replace(/\s+/g, " "))
    .filter(Boolean);
  const path = parts.join(" : ");
  return PLACEHOLDERS.has(path.toLowerCase()) ? "" : path;
}

/** cost_centre_mapped is the cleaned value; fall back to the raw cost_centre when it is unmapped. */
function employeeCostCenterPath(row) {
  return normalizePath(row.cost_centre_mapped) || normalizePath(row.cost_centre);
}

function cityKey(value) {
  return String(value || "").trim().toLowerCase();
}

/** School paths name their city ("… : Schools : Pune : MEMS"); otherwise use where most staff sit. */
function pickCityName(path, locationCounts, knownCityKeys) {
  const segments = path.split(" : ");
  const schoolsAt = segments.findIndex((s) => /^schools?$/i.test(s));
  if (schoolsAt >= 0 && knownCityKeys.has(cityKey(segments[schoolsAt + 1]))) {
    return segments[schoolsAt + 1];
  }
  const ranked = [...locationCounts.entries()].sort((a, b) => b[1] - a[1]);
  return ranked[0]?.[0] || null;
}

function codeFor(name, taken) {
  const base = name.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 36) || "CC";
  let code = base;
  for (let n = 2; taken.has(code); n += 1) code = `${base}-${n}`;
  taken.add(code);
  return code;
}

async function readEmployeeCostCenters() {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT cost_centre, cost_centre_mapped, location, COUNT(*) AS n FROM ${EMPLOYEES} GROUP BY 1, 2, 3`
  );
  const byPath = new Map();
  const skipped = [];
  for (const row of rows) {
    const path = employeeCostCenterPath(row);
    if (!path) {
      skipped.push({ reason: "no_cost_centre", value: row.cost_centre || "", employees: Number(row.n) });
      continue;
    }
    const entry = byPath.get(path) || { path, locations: new Map() };
    const location = String(row.location || "").trim();
    if (location && location.toLowerCase() !== "null") {
      entry.locations.set(location, (entry.locations.get(location) || 0) + Number(row.n));
    }
    byPath.set(path, entry);
  }
  return { centers: [...byPath.values()], skipped };
}

/**
 * Mirrors the distinct cost centres in AFDW.employees into CostCenter. Cities named by
 * AFDW locations that the app lacks are created. Centres that no longer appear are
 * deactivated, never deleted, so events keep their link.
 */
async function syncCostCentersFromEmployees() {
  const { centers, skipped } = await readEmployeeCostCenters();

  const locations = new Set(centers.flatMap((c) => [...c.locations.keys()]));
  let cities = await prisma.city.findMany();
  const maxSort = cities.reduce((max, c) => Math.max(max, c.sortOrder), 0);
  let added = 0;
  for (const name of locations) {
    if (!cities.some((c) => cityKey(c.name) === cityKey(name))) {
      added += 1;
      await prisma.city.create({ data: { name, sortOrder: maxSort + added } });
    }
  }
  if (added) cities = await prisma.city.findMany();
  const cityByKey = new Map(cities.map((c) => [cityKey(c.name), c]));
  const knownCityKeys = new Set(cityByKey.keys());

  const existing = await prisma.costCenter.findMany();
  const byFinanceId = new Map(existing.filter((c) => c.financeId).map((c) => [c.financeId, c]));
  const takenCodes = new Set(existing.map((c) => c.code));

  const synced = [];
  for (const center of centers) {
    const name = center.path.split(" : ").pop();
    const city = cityByKey.get(cityKey(pickCityName(center.path, center.locations, knownCityKeys)));
    const current = byFinanceId.get(center.path);
    const data = { name, description: center.path, cityId: city?.id || null, isActive: true };
    const record = current
      ? await prisma.costCenter.update({ where: { id: current.id }, data })
      : await prisma.costCenter.create({
          data: { ...data, financeId: center.path, code: codeFor(name, takenCodes) },
        });
    synced.push(record);
  }

  const seen = new Set(centers.map((c) => c.path));
  // Only centres this sync created (financeId and description both hold the path), never
  // ones from the Finance table or added by hand.
  const fromEmployees = (c) => c.financeId && c.description === c.financeId;
  const gone = existing.filter((c) => fromEmployees(c) && c.isActive && !seen.has(c.financeId));
  if (gone.length) {
    await prisma.costCenter.updateMany({
      where: { id: { in: gone.map((c) => c.id) } },
      data: { isActive: false },
    });
  }

  return {
    synced,
    skipped,
    deactivated: gone.length,
    citiesAdded: added,
    columnMap: { table: EMPLOYEES, path: "cost_centre_mapped (fallback cost_centre)", city: "location" },
  };
}

/**
 * The AFDW employee for an app user and their CostCenter. Matches by employee_code once
 * known, and by work email only to find someone the first time.
 * Returns null when the person is not in AFDW.
 */
async function findEmployeeCostCenter({ employeeCode, email }) {
  const columns = "employee_code, cost_centre, cost_centre_mapped, location";
  let rows = [];
  if (employeeCode) {
    rows = await prisma.$queryRawUnsafe(
      `SELECT ${columns} FROM ${EMPLOYEES} WHERE employee_code = ? LIMIT 1`,
      employeeCode
    );
  }
  if (!rows.length && email) {
    rows = await prisma.$queryRawUnsafe(
      `SELECT ${columns} FROM ${EMPLOYEES} WHERE LOWER(work_email) = ? LIMIT 1`,
      String(email).toLowerCase()
    );
  }
  if (!rows.length) return null;

  const code = String(rows[0].employee_code || "").trim() || null;
  const path = employeeCostCenterPath(rows[0]);
  if (!path) return { employeeCode: code, center: null };
  const find = () => prisma.costCenter.findFirst({ where: { financeId: path, isActive: true } });
  // A centre added in AFDW since the last sync: sync once so the person still gets it.
  const center = (await find()) || (await syncCostCentersFromEmployees().then(find));
  return { employeeCode: code, center };
}

module.exports = {
  syncCostCentersFromEmployees,
  findEmployeeCostCenter,
};
