import { Platform } from "react-native";
import { CaptureLayout } from "../components/CaptureLayout";
import { ProfileScreen } from "../screens/ProfileScreen";
import { CalendarEventsScreen, type ImportArgs } from "../screens/CalendarEventsScreen";
import type { CalendarImportResult, City, CostCenter, GoogleCalendarEvent, GoogleCalendarEventsPage, User } from "../types/app";
import { SAMPLE_ITEMS } from "./CardPreview";

/**
 * Dev-only previews of the Special Access calendar feature (web only):
 *   http://localhost:8081/?preview=profile                     Profile with "Connect Calendar"
 *   http://localhost:8081/?preview=profile&calendar=connected  Profile once a calendar is linked
 *   http://localhost:8081/?preview=calendar                    Events preview page with sample events
 */
const user: User = {
  id: "u1",
  name: "Priya Sharma",
  email: "priya.sharma@akanksha.org",
  role: "special",
  cityId: "c1",
  cityName: "Pune",
  cityState: "Maharashtra",
  costCenterId: "cc1",
  costCenterCode: "HAD",
  costCenterName: "Hadapsar Centre",
};

const cities: City[] = [{ id: "c1", name: "Pune", state: "Maharashtra", sortOrder: 1, isActive: true }];
const costCenters: CostCenter[] = [
  { id: "cc1", code: "HAD", name: "Hadapsar Centre", description: "", cityId: "c1", cityName: "Pune", sortOrder: 1 } as CostCenter,
];

/** Query params of the web page; empty on phones, where window.location does not exist. */
function webParams(): URLSearchParams {
  const search = Platform.OS === "web" && typeof window !== "undefined" ? window.location?.search ?? "" : "";
  return new URLSearchParams(search);
}

function hasParam(name: string, value: string) {
  return webParams().get(name) === value;
}

export function ProfilePreview() {
  const connected = hasParam("calendar", "connected");
  return (
    <CaptureLayout header={{ title: "Profile", subtitle: "", onMore: () => {} }}>
      <ProfileScreen
        user={user}
        events={SAMPLE_ITEMS}
        isAdmin={false}
        onOpenAdmin={() => {}}
        onLogout={() => {}}
        calendar={{
          connection: connected ? { connected: true, email: user.email, connectedAt: new Date().toISOString() } : { connected: false },
          connecting: false,
          onConnect: () => {},
          onDisconnect: () => {},
          onOpenEvents: () => {},
        }}
      />
    </CaptureLayout>
  );
}

const day = (offset: number, hour?: number, minute = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  if (hour === undefined) return d.toISOString().slice(0, 10);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

const sampleEvent = (partial: Partial<GoogleCalendarEvent> & { id: string; title: string }): GoogleCalendarEvent => ({
  description: "",
  location: "",
  allDay: false,
  start: null,
  end: null,
  timeZone: "Asia/Kolkata",
  status: "confirmed",
  htmlLink: "https://calendar.google.com/",
  organizer: "",
  attendeeCount: 0,
  calendarName: user.email,
  ...partial,
});

export const SAMPLE_CALENDAR_EVENTS: GoogleCalendarEvent[] = [
  sampleEvent({ id: "g1", title: "Science Fair setup walkthrough", start: day(0, 10), end: day(0, 11, 30), location: "Hadapsar Centre, Main Hall", description: "Final checks on tables, power and the robotics corner before the fair opens.", organizer: "Rahul Deshmukh", attendeeCount: 6 }),
  sampleEvent({ id: "g2", title: "Donor visit: Tata Trusts", start: day(1, 14), end: day(1, 15), location: "Wadgaon Sheri Community Hall", organizer: "priya.sharma@akanksha.org", attendeeCount: 4 }),
  sampleEvent({ id: "g3", title: "Annual Science Fair 2026", allDay: true, start: day(3), end: day(6), location: "Hadapsar Centre", description: "Students present their projects to parents, donors and the community." }),
  sampleEvent({ id: "g4", title: "Health camp planning", start: day(3, 9, 30), end: day(3, 10, 15), status: "tentative", attendeeCount: 3 }),
  sampleEvent({ id: "g5", title: "School kit distribution", allDay: true, start: day(9), end: day(10), location: "Yerwada Centre", description: "Distribute the monsoon kits to Grade 3–5 students." }),
];

/** Ids "imported" during this preview session, so the Imported badge shows after a fake import. */
const previewImported = new Map<string, string>(hasParam("imported", "1") ? [["g2", "evt-g2"]] : []);

export function CalendarEventsPreview() {
  const loadEvents = async ({ from, to }: { from: Date; to: Date }): Promise<GoogleCalendarEventsPage> => ({
    calendarName: user.email,
    timeZone: "Asia/Kolkata",
    from: from.toISOString(),
    to: to.toISOString(),
    events: SAMPLE_CALENDAR_EVENTS.map((event) => ({ ...event, importedEventId: previewImported.get(event.id) ?? null })),
  });
  const importEvents = async ({ eventIds }: ImportArgs): Promise<CalendarImportResult> => {
    await new Promise((resolve) => setTimeout(resolve, 600));
    const imported: CalendarImportResult["imported"] = [];
    const skipped: CalendarImportResult["skipped"] = [];
    for (const id of eventIds) {
      if (previewImported.has(id)) {
        skipped.push({ id, reason: "already_imported", eventId: previewImported.get(id) });
        continue;
      }
      previewImported.set(id, `evt-${id}`);
      imported.push({ id, eventId: `evt-${id}`, title: SAMPLE_CALENDAR_EVENTS.find((event) => event.id === id)?.title ?? null });
    }
    return { imported, skipped, importedCount: imported.length, skippedCount: skipped.length };
  };
  return (
    <CalendarEventsScreen
      token="preview"
      cities={cities}
      costCenters={[...costCenters, { id: "cc2", code: "WAD", name: "Wadgaon Sheri Centre", description: "", cityId: "c1", cityName: "Pune", sortOrder: 2 } as CostCenter]}
      defaultCostCenterId="cc1"
      onReconnect={() => {}}
      loadEvents={loadEvents}
      importEvents={importEvents}
    />
  );
}
