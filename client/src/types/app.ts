import type { ImagePickerAsset } from "expo-image-picker";

export type UserRole = "user" | "donor" | "special" | "super_admin";

export type Permission =
  | "view_events"
  | "add_post"
  | "add_story"
  | "approve_post"
  | "export_report"
  | "create_event"
  | "import_events"
  | "manage_settings"
  | "manage_access";

export type User = {
  id: string;
  name: string;
  email: string;
  /** AFDW employee_code, empty when the person is not in AFDW. */
  employeeCode?: string;
  role: string;
  /** ISO time the account was created; notifications older than this are never unread. */
  createdAt?: string | null;
  cityId?: string | null;
  cityName?: string;
  cityState?: string;
  costCenterId?: string | null;
  costCenterCode?: string;
  costCenterName?: string;
  /** Full AFDW cost centre path, e.g. "Projects : Schools : Pune : MEMS". */
  costCenterPath?: string;
  /** Cost centre and city come from the employee record and cannot be edited here. */
  costCenterLocked?: boolean;
  /** Sent by the backend; the app shows or hides actions based on this. */
  permissions?: Permission[];
};

export type ProfileUpdate = {
  name?: string;
  cityId?: string | null;
  costCenterId?: string | null;
};

export type EventType = {
  id: string;
  name: string;
};

export type City = {
  id: string;
  name: string;
  state?: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type CostCenter = {
  id: string;
  financeId?: string;
  code: string;
  name: string;
  description: string;
  cityId: string | null;
  cityName: string;
  sortOrder: number;
  isActive: boolean;
  donorCount?: number;
};

export type Donor = {
  id: string;
  email: string;
  name: string;
  costCenterId: string;
  costCenterName: string;
  costCenterCode: string;
  isActive: boolean;
};

export type EventStatus = "upcoming" | "ongoing" | "complete";

export type ReviewStatus = "pending" | "approved";

/** What a record is: an event (the occasion), or a post or story attached to one. */
export type ContentKind = "event" | "post" | "story";

export type EventItem = {
  id: string;
  title: string;
  caption: string;
  typeId: string | null;
  eventDate: string;
  endDate?: string | null;
  location: string;
  eventStatus: EventStatus;
  approvedForGallery: boolean;
  costCenterId: string | null;
  costCenterCode: string;
  costCenterName: string;
  cityId: string | null;
  cityName: string;
  mediaType: "photo" | "video";
  mediaUrl: string;
  originalName: string;
  uploadedBy: string;
  uploadedByName?: string;
  uploadedByEmail?: string;
  createdAt: string;
  eventTypeName: string;
  uploadedByRole?: string;
  reviewStatus?: ReviewStatus;
  reviewedAt?: string | null;
  reviewedById?: string | null;
  reviewedByName?: string | null;
  reviewedByRole?: string | null;
  kind?: ContentKind;
  parentEventId?: string | null;
  parentTitle?: string | null;
  body?: string | null;
  postCount?: number;
  storyCount?: number;
};

/** Admin-editable limits. `polish` is how many times "Polish with AI" may run on one draft description. */
export type AppLimits = { posts: number; stories: number; polish: number };

export type EventDetail = {
  event: EventItem;
  posts: EventItem[];
  stories: EventItem[];
  limits?: AppLimits;
  myCounts?: { posts: number; stories: number };
  /** null means unlimited (Super Admin). */
  remaining?: { posts: number | null; stories: number | null };
};

export type CalendarEntry = {
  id: string;
  title: string;
  description: string;
  eventDate: string;
  endDate: string | null;
  location: string;
  costCenterId: string;
  costCenterName: string;
  costCenterCode: string;
  cityId: string | null;
  cityName: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AppRoute = "home" | "notFound";

export type MediaMode = "photo" | "video";

export type SelectedMedia = ImagePickerAsset | null;

export type HubTab = "feed" | "ongoing" | "upcoming" | "capture" | "calendar";

/** Whether the user has linked their Google Calendar (Special Access feature). */
export type CalendarConnection =
  | { connected: false }
  | { connected: true; email: string; connectedAt: string };

/** One event read from the user's Google Calendar (not yet an app event). */
export type GoogleCalendarEvent = {
  id: string;
  title: string;
  description: string;
  location: string;
  allDay: boolean;
  /** ISO date-time, or YYYY-MM-DD for all-day events. */
  start: string | null;
  end: string | null;
  timeZone: string | null;
  status: string;
  htmlLink: string;
  organizer: string;
  attendeeCount: number;
  calendarName: string;
  /** App event id when this calendar event was already imported. */
  importedEventId?: string | null;
};

export type CalendarImportResult = {
  imported: { id: string; eventId: string; title: string | null }[];
  skipped: { id: string; reason: "already_imported" | "not_found" | "no_date"; eventId?: string }[];
  importedCount: number;
  skippedCount: number;
};

export type GoogleCalendarEventsPage = {
  calendarName: string;
  timeZone: string | null;
  from: string;
  to: string;
  events: GoogleCalendarEvent[];
};
