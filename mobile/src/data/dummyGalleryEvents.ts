import type { City, EventItem } from "../types/app";

/** Temporary preview data for CaptureAkanksha until real approved events exist. */
export const USE_DUMMY_GALLERY = true;

function photo(seed: string) {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/640/480`;
}

function baseEvent(
  city: City,
  partial: Pick<EventItem, "id" | "title" | "caption" | "eventDate" | "location" | "eventTypeName"> & {
    mediaSeed: string;
    mediaType?: EventItem["mediaType"];
  }
): EventItem {
  const now = new Date().toISOString();
  return {
    id: partial.id,
    title: partial.title,
    caption: partial.caption,
    typeId: "dummy-type",
    eventDate: partial.eventDate,
    location: partial.location,
    eventStatus: "complete",
    approvedForGallery: true,
    costCenterId: `dummy-cc-${city.id}`,
    costCenterCode: `CC-${city.name.replace(/\s+/g, "-").toUpperCase()}`,
    costCenterName: `${city.name} Program Operations`,
    cityId: city.id,
    cityName: city.name,
    mediaType: partial.mediaType ?? "photo",
    mediaUrl: photo(partial.mediaSeed),
    originalName: `${partial.mediaSeed}.jpg`,
    uploadedBy: "dummy-user",
    uploadedByName: "Akanksha Volunteer",
    uploadedByEmail: "volunteer@akanksha.org",
    createdAt: now,
    eventTypeName: partial.eventTypeName,
  };
}

export function getDummyGalleryEvents(city: City): EventItem[] {
  const c = city.name;
  return [
    baseEvent(city, {
      id: "dummy-1",
      title: "Annual Health Camp Wrap-up",
      caption: "Free check-ups and medicine distribution for 200+ families in the community hall.",
      eventDate: "2026-05-18",
      location: `${c} Community Hall`,
      eventTypeName: "Medical Camp",
      mediaSeed: `${c}-health-1`,
    }),
    baseEvent(city, {
      id: "dummy-2",
      title: "Volunteer Team Photo",
      caption: "Our medical camp volunteers after the final session.",
      eventDate: "2026-05-18",
      location: `${c} Community Hall`,
      eventTypeName: "Medical Camp",
      mediaSeed: `${c}-health-2`,
    }),
    baseEvent(city, {
      id: "dummy-3",
      title: "School Kit Distribution",
      caption: "Notebooks and stationery handed out to students ahead of the new term.",
      eventDate: "2026-05-18",
      location: `Akanksha Learning Centre, ${c}`,
      eventTypeName: "Donation Drive",
      mediaSeed: `${c}-school-1`,
    }),
    baseEvent(city, {
      id: "dummy-4",
      title: "Creative Workshop Showcase",
      caption: "Students displayed art and science projects from the weekend workshop.",
      eventDate: "2026-05-15",
      location: `Akanksha Learning Centre, ${c}`,
      eventTypeName: "Workshop",
      mediaSeed: `${c}-workshop-1`,
    }),
    baseEvent(city, {
      id: "dummy-5",
      title: "STEM Demo Day",
      caption: "Hands-on robotics and coding demos for middle-school learners.",
      eventDate: "2026-05-15",
      location: `Akanksha Learning Centre, ${c}`,
      eventTypeName: "Workshop",
      mediaSeed: `${c}-workshop-2`,
    }),
    baseEvent(city, {
      id: "dummy-6",
      title: "Neighbourhood Food Drive",
      caption: "Dry ration kits packed and delivered with partner NGOs.",
      eventDate: "2026-05-15",
      location: `${c} West — Partner NGO Hub`,
      eventTypeName: "Donation Drive",
      mediaSeed: `${c}-food-1`,
    }),
    baseEvent(city, {
      id: "dummy-7",
      title: "Volunteer Briefing",
      caption: "Morning coordination before the food drive routes began.",
      eventDate: "2026-05-15",
      location: `${c} West — Partner NGO Hub`,
      eventTypeName: "Donation Drive",
      mediaSeed: `${c}-food-2`,
    }),
    baseEvent(city, {
      id: "dummy-8",
      title: "Sports Day Finals",
      caption: "Inter-centre athletics and team games at the municipal ground.",
      eventDate: "2026-05-10",
      location: `${c} Municipal Sports Ground`,
      eventTypeName: "Workshop",
      mediaSeed: `${c}-sports-1`,
    }),
    baseEvent(city, {
      id: "dummy-9",
      title: "Medal Ceremony",
      caption: "Celebrating student athletes and peer mentors.",
      eventDate: "2026-05-10",
      location: `${c} Municipal Sports Ground`,
      eventTypeName: "Workshop",
      mediaSeed: `${c}-sports-2`,
    }),
    baseEvent(city, {
      id: "dummy-10",
      title: "Parent Engagement Meet",
      caption: "Open house with parents on learning outcomes and centre updates.",
      eventDate: "2026-05-10",
      location: `${c} Central Auditorium`,
      eventTypeName: "Workshop",
      mediaSeed: `${c}-parent-1`,
    }),
    baseEvent(city, {
      id: "dummy-11",
      title: "Cultural Evening",
      caption: "Music and dance performances by student cultural clubs.",
      eventDate: "2026-05-10",
      location: `${c} Central Auditorium`,
      eventTypeName: "Workshop",
      mediaSeed: `${c}-parent-2`,
      mediaType: "video",
    }),
  ];
}
