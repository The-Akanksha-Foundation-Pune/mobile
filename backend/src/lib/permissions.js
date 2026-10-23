/**
 * Role -> permission map. Routes check permissions, never role names, so adding a
 * role or moving a capability between roles is a change to this file only.
 */
const BASE = ["view_events", "add_post", "add_story"];
const REPORTING = ["approve_post", "export_report"];
const EVENTS = ["create_event", "import_events"];

const ROLE_PERMISSIONS = {
  user: [...BASE],
  donor: [...BASE, ...REPORTING],
  special: [...BASE, ...REPORTING, ...EVENTS],
  super_admin: [...BASE, ...REPORTING, ...EVENTS, "manage_settings", "manage_access"],
};

const ROLE_LABELS = {
  user: "Normal User",
  donor: "Donor Team",
  special: "Special Access",
  super_admin: "Super Admin",
};

const ROLES = Object.keys(ROLE_PERMISSIONS);

function permissionsForRole(role) {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.user;
}

function hasPermission(user, permission) {
  return permissionsForRole(user?.role).includes(permission);
}

/** Emails that become Super Admin at login (SUPER_ADMIN_EMAILS, comma separated) or the legacy admin@ prefix. */
function isBootstrapSuperAdmin(email) {
  const normalized = String(email || "").toLowerCase();
  const list = (process.env.SUPER_ADMIN_EMAILS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(normalized) || normalized.startsWith("admin@");
}

module.exports = { ROLE_PERMISSIONS, ROLE_LABELS, ROLES, permissionsForRole, hasPermission, isBootstrapSuperAdmin };
