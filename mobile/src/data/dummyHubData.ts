import type { CalendarEntry, City, CostCenter, EventItem, EventStatus } from "../types/app";

/** Temporary preview data scoped by cost center (for donor notifications). */
export const USE_DUMMY_HUB_DATA = false;

export const USE_DUMMY_GALLERY = USE_DUMMY_HUB_DATA;

function photo(seed: string) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/640/480`;
}

const now = () => new Date().toISOString();

export function getDummyCostCenters(): CostCenter[] {
  return [
    {
      id: "dummy-cc-mum",
      code: "CC-MUM-PROG",
      name: "Mumbai Program Operations",
      description: "Schools and community programs in Mumbai",
      cityId: "dummy-city-mum",
      cityName: "Mumbai",
      sortOrder: 1,
      isActive: true,
      donorCount: 2,
    },
    {
      id: "dummy-cc-del",
      code: "CC-DEL-PROG",
      name: "Delhi NCR Program Operations",
      description: "Learning centres in Delhi NCR",
      cityId: "dummy-city-del",
      cityName: "Delhi NCR",
      sortOrder: 2,
      isActive: true,
      donorCount: 1,
    },
    {
      id: "dummy-cc-blr",
      code: "CC-BLR-PROG",
      name: "Bengaluru Program Operations",
      description: "STEM and workshops in Bengaluru",
      cityId: "dummy-city-blr",
      cityName: "Bengaluru",
      sortOrder: 3,
      isActive: true,
      donorCount: 1,
    },
    {
      id: "dummy-cc-fnd",
      code: "CC-FND-RAISE",
      name: "Fundraising & Donor Relations",
      description: "Pan-India donor engagement events",
      cityId: "dummy-city-mum",
      cityName: "Mumbai",
      sortOrder: 10,
      isActive: true,
      donorCount: 1,
    },
  ];
}

function baseEvent(
  center: CostCenter,
  partial: Pick<EventItem, "id" | "title" | "caption" | "eventDate" | "location" | "eventTypeName"> & {
    eventStatus: EventStatus;
    mediaSeed: string;
    mediaType?: EventItem["mediaType"];
    approvedForGallery?: boolean;
  }
): EventItem {
  return {
    id: partial.id,
    title: partial.title,
    caption: partial.caption,
    typeId: "dummy-type",
    eventDate: partial.eventDate,
    location: partial.location,
    eventStatus: partial.eventStatus,
    approvedForGallery: partial.approvedForGallery ?? false,
    costCenterId: center.id,
    costCenterCode: center.code,
    costCenterName: center.name,
    cityId: center.cityId,
    cityName: center.cityName,
    mediaType: partial.mediaType ?? "photo",
    mediaUrl: photo(partial.mediaSeed),
    originalName: `${partial.mediaSeed}.jpg`,
    uploadedBy: "dummy-user",
    uploadedByName: "Akanksha Volunteer",
    uploadedByEmail: "volunteer@akanksha.org",
    createdAt: now(),
    eventTypeName: partial.eventTypeName,
  };
}

function baseCalendarEntry(
  center: CostCenter,
  partial: Pick<CalendarEntry, "id" | "title" | "description" | "eventDate" | "location"> & {
    endDate?: string | null;
  }
): CalendarEntry {
  const stamp = now();
  return {
    id: partial.id,
    title: partial.title,
    description: partial.description,
    eventDate: partial.eventDate,
    endDate: partial.endDate ?? null,
    location: partial.location,
    costCenterId: center.id,
    costCenterName: center.name,
    costCenterCode: center.code,
    cityId: center.cityId,
    cityName: center.cityName,
    isPublished: true,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

function forCenter(centerId: string, items: EventItem[]) {
  return items.filter((e) => e.costCenterId === centerId);
}

function buildAllOngoing(): EventItem[] {
  const centers = getDummyCostCenters();
  const by = (code: string) => centers.find((c) => c.code === code)!;
  return [
    baseEvent(by("CC-MUM-PROG"), {
      id: "ongoing-mum-1",
      title: "Community Health Camp — Day 2",
      caption: "Free screenings at the community hall.",
      eventDate: "2026-05-21",
      location: "Mumbai Community Hall",
      eventTypeName: "Medical Camp",
      eventStatus: "ongoing",
      mediaSeed: "mum-ongoing-1",
    }),
    baseEvent(by("CC-DEL-PROG"), {
      id: "ongoing-del-1",
      title: "Delhi Summer Reading Club",
      caption: "Daily reading sessions for primary students.",
      eventDate: "2026-05-21",
      location: "Akanksha Learning Centre, Delhi NCR",
      eventTypeName: "Workshop",
      eventStatus: "ongoing",
      mediaSeed: "del-ongoing-1",
    }),
    baseEvent(by("CC-BLR-PROG"), {
      id: "ongoing-blr-1",
      title: "STEM Lab Open Day",
      caption: "Robotics and coding demos for learners.",
      eventDate: "2026-05-20",
      location: "Bengaluru Learning Centre",
      eventTypeName: "Workshop",
      eventStatus: "ongoing",
      mediaSeed: "blr-ongoing-1",
    }),
    baseEvent(by("CC-FND-RAISE"), {
      id: "ongoing-fnd-1",
      title: "Donor Site Visit — Mumbai Schools",
      caption: "Donors touring program impact locations.",
      eventDate: "2026-05-20",
      location: "Mumbai — School cluster A",
      eventTypeName: "Donation Drive",
      eventStatus: "ongoing",
      mediaSeed: "fnd-ongoing-1",
    }),
  ];
}

function buildAllUpcoming(): EventItem[] {
  const centers = getDummyCostCenters();
  const by = (code: string) => centers.find((c) => c.code === code)!;
  return [
    baseEvent(by("CC-MUM-PROG"), {
      id: "upcoming-mum-1",
      title: "Mumbai Fundraiser Evening",
      caption: "Annual gala with student performances.",
      eventDate: "2026-05-28",
      location: "Mumbai Central Auditorium",
      eventTypeName: "Donation Drive",
      eventStatus: "upcoming",
      mediaSeed: "mum-up-1",
    }),
    baseEvent(by("CC-DEL-PROG"), {
      id: "upcoming-del-1",
      title: "Delhi Parent Open House",
      caption: "Progress reviews with families.",
      eventDate: "2026-06-08",
      location: "Delhi NCR Learning Centre",
      eventTypeName: "Workshop",
      eventStatus: "upcoming",
      mediaSeed: "del-up-1",
    }),
    baseEvent(by("CC-BLR-PROG"), {
      id: "upcoming-blr-1",
      title: "Bengaluru Robotics Bootcamp",
      caption: "Three-day STEM bootcamp.",
      eventDate: "2026-06-02",
      location: "Bengaluru Learning Centre",
      eventTypeName: "Workshop",
      eventStatus: "upcoming",
      mediaSeed: "blr-up-1",
    }),
    baseEvent(by("CC-FND-RAISE"), {
      id: "upcoming-fnd-1",
      title: "National Donor Roundtable",
      caption: "Quarterly briefing for cost-center donors.",
      eventDate: "2026-06-14",
      location: "Virtual + Mumbai HQ",
      eventTypeName: "Donation Drive",
      eventStatus: "upcoming",
      mediaSeed: "fnd-up-1",
    }),
  ];
}

function buildAllGallery(): EventItem[] {
  const centers = getDummyCostCenters();
  const by = (code: string) => centers.find((c) => c.code === code)!;
  const mum = by("CC-MUM-PROG");
  return [
    baseEvent(mum, {
      id: "gallery-mum-1",
      title: "Health Camp Wrap-up",
      caption: "200+ families served at the community hall.",
      eventDate: "2026-05-18",
      location: "Mumbai Community Hall",
      eventTypeName: "Medical Camp",
      eventStatus: "complete",
      approvedForGallery: true,
      mediaSeed: "mum-gal-1",
    }),
    baseEvent(mum, {
      id: "gallery-mum-2",
      title: "School Kit Distribution",
      caption: "Stationery for the new term.",
      eventDate: "2026-05-18",
      location: "Akanksha Learning Centre, Mumbai",
      eventTypeName: "Donation Drive",
      eventStatus: "complete",
      approvedForGallery: true,
      mediaSeed: "mum-gal-2",
    }),
    baseEvent(mum, {
      id: "gallery-mum-3",
      title: "Sports Day Finals",
      caption: "Inter-centre athletics at municipal ground.",
      eventDate: "2026-05-10",
      location: "Mumbai Municipal Sports Ground",
      eventTypeName: "Workshop",
      eventStatus: "complete",
      approvedForGallery: true,
      mediaSeed: "mum-gal-3",
    }),
    baseEvent(by("CC-DEL-PROG"), {
      id: "gallery-del-1",
      title: "Delhi Workshop Showcase",
      caption: "Student science fair highlights.",
      eventDate: "2026-05-15",
      location: "Delhi NCR Learning Centre",
      eventTypeName: "Workshop",
      eventStatus: "complete",
      approvedForGallery: true,
      mediaSeed: "del-gal-1",
    }),
    baseEvent(by("CC-BLR-PROG"), {
      id: "gallery-blr-1",
      title: "Food Drive Completion",
      caption: "Ration kits delivered with NGO partners.",
      eventDate: "2026-05-15",
      location: "Bengaluru West Hub",
      eventTypeName: "Donation Drive",
      eventStatus: "complete",
      approvedForGallery: true,
      mediaSeed: "blr-gal-1",
    }),
  ];
}

const ALL_ONGOING = buildAllOngoing();
const ALL_UPCOMING = buildAllUpcoming();
const ALL_GALLERY = buildAllGallery();
const ALL_COMPLETE = [...ALL_ONGOING, ...ALL_UPCOMING, ...ALL_GALLERY].filter(
  (event) => event.eventStatus === "complete"
);

export function getDummyOngoingEvents(center: CostCenter): EventItem[] {
  return forCenter(center.id, ALL_ONGOING);
}

export function getDummyUpcomingEvents(center: CostCenter): EventItem[] {
  return forCenter(center.id, ALL_UPCOMING);
}

export function getDummyGalleryEvents(center: CostCenter): EventItem[] {
  return forCenter(center.id, ALL_GALLERY);
}

/** All completed events for CaptureAkanksha (not limited to gallery-approved). */
export function getDummyCompletedEvents(center: CostCenter): EventItem[] {
  return forCenter(center.id, ALL_COMPLETE);
}

/** Completed events across all cost centers in a city (CaptureAkanksha tab). */
export function getDummyCompletedEventsByCity(city: City): EventItem[] {
  return ALL_COMPLETE.filter((event) => event.cityId === city.id || event.cityName === city.name);
}

function buildAllCalendar(): CalendarEntry[] {
  const centers = getDummyCostCenters();
  const by = (code: string) => centers.find((c) => c.code === code)!;
  return [
    baseCalendarEntry(by("CC-MUM-PROG"), {
      id: "cal-mum-1",
      title: "Health Camp — Day 2",
      description: "Ongoing medical camp.",
      eventDate: "2026-05-21",
      location: "Mumbai Community Hall",
    }),
    baseCalendarEntry(by("CC-MUM-PROG"), {
      id: "cal-mum-2",
      title: "Fundraiser Evening",
      description: "Upcoming donor gala.",
      eventDate: "2026-05-28",
      location: "Mumbai Central Auditorium",
    }),
    baseCalendarEntry(by("CC-DEL-PROG"), {
      id: "cal-del-1",
      title: "Summer Reading Club",
      description: "Daily sessions.",
      eventDate: "2026-05-21",
      location: "Delhi NCR Learning Centre",
    }),
    baseCalendarEntry(by("CC-BLR-PROG"), {
      id: "cal-blr-1",
      title: "STEM Lab Open Day",
      description: "Robotics demos.",
      eventDate: "2026-05-20",
      location: "Bengaluru Learning Centre",
    }),
    baseCalendarEntry(by("CC-FND-RAISE"), {
      id: "cal-fnd-1",
      title: "Donor Site Visit",
      description: "Donor tour of schools.",
      eventDate: "2026-05-20",
      location: "Mumbai — School cluster A",
    }),
    baseCalendarEntry(by("CC-MUM-PROG"), {
      id: "cal-mum-3",
      title: "Health Camp Archive",
      description: "Completed camp — gallery available.",
      eventDate: "2026-05-18",
      location: "Mumbai Community Hall",
    }),
  ];
}

const ALL_CALENDAR = buildAllCalendar();

export function getDummyCalendarEntries(center: CostCenter, month?: string): CalendarEntry[] {
  const scoped = ALL_CALENDAR.filter((e) => e.costCenterId === center.id);
  if (!month) return scoped;
  return scoped.filter((e) => e.eventDate.startsWith(month));
}
