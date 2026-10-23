import type { BadgeTone } from "../components/capture";
import type { Permission, User, UserRole } from "../types/app";

/** Mirror of the backend map, used only when a session predates the permissions field. */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  user: ["view_events", "add_post", "add_story"],
  donor: ["view_events", "add_post", "add_story", "approve_post", "export_report"],
  special: ["view_events", "add_post", "add_story", "approve_post", "export_report", "create_event", "import_events"],
  super_admin: [
    "view_events",
    "add_post",
    "add_story",
    "approve_post",
    "export_report",
    "create_event",
    "import_events",
    "manage_settings",
    "manage_access",
  ],
};

export function can(user: User | null | undefined, permission: Permission): boolean {
  if (!user) return false;
  if (user.permissions) return user.permissions.includes(permission);
  return (ROLE_PERMISSIONS[user.role as UserRole] ?? ROLE_PERMISSIONS.user).includes(permission);
}

export const ROLE_OPTIONS: { id: UserRole; label: string; description: string }[] = [
  { id: "user", label: "Normal User", description: "Add posts and stories, view all events" },
  { id: "donor", label: "Donor Team", description: "Also approve posts and export event reports" },
  { id: "special", label: "Special Access", description: "Also create events and import from Google Calendar" },
  { id: "super_admin", label: "Super Admin", description: "Everything, including giving and removing access" },
];

export function roleLabel(role: string): string {
  return ROLE_OPTIONS.find((option) => option.id === role)?.label ?? role;
}

export function roleTone(role: string): BadgeTone {
  switch (role) {
    case "super_admin":
      return "primary";
    case "special":
      return "tertiary";
    case "donor":
      return "secondary";
    default:
      return "neutral";
  }
}
