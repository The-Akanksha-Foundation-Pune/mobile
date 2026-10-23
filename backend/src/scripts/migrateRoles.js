/**
 * Converts legacy roles to the role-access set on a shared database.
 * Run BEFORE `prisma db push` on a database that still has volunteer/employee/admin rows:
 *   node src/scripts/migrateRoles.js && npx prisma db push --accept-data-loss
 * Safe to re-run: it only widens the enum, remaps rows, and leaves the final narrowing to db push.
 */
require("../lib/env");
const prisma = require("../lib/prisma");

const ALL_ROLES = ["user", "donor", "special", "super_admin", "admin", "employee", "volunteer"];

async function main() {
  const enumSql = ALL_ROLES.map((role) => `'${role}'`).join(", ");
  await prisma.$executeRawUnsafe(`ALTER TABLE \`User\` MODIFY \`role\` ENUM(${enumSql}) NOT NULL DEFAULT 'user'`);
  const toUser = await prisma.$executeRawUnsafe("UPDATE `User` SET `role` = 'user' WHERE `role` IN ('volunteer', 'employee')");
  const toSuper = await prisma.$executeRawUnsafe("UPDATE `User` SET `role` = 'super_admin' WHERE `role` = 'admin'");
  const left = await prisma.$queryRawUnsafe("SELECT `role`, COUNT(*) AS n FROM `User` GROUP BY `role`");
  console.log(`Remapped ${toUser} user(s) to Normal User and ${toSuper} to Super Admin.`);
  console.log("Roles now:", left.map((row) => `${row.role}=${row.n}`).join(", "));
  console.log("Next: npx prisma db push --accept-data-loss  (drops the legacy enum values)");
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
