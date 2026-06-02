import type { EventItem } from "../types/app";

export function groupByDateAndLocation(events: EventItem[]) {
  const grouped: Record<string, Record<string, EventItem[]>> = {};

  for (const event of events) {
    const dateKey = event.eventDate;
    const locationKey =
      event.location?.trim() || event.cityName?.trim() || event.costCenterName?.trim() || "General venue";

    if (!grouped[dateKey]) {
      grouped[dateKey] = {};
    }
    if (!grouped[dateKey][locationKey]) {
      grouped[dateKey][locationKey] = [];
    }
    grouped[dateKey][locationKey].push(event);
  }

  return Object.entries(grouped)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, byLocation]) => ({
      date,
      locations: Object.entries(byLocation)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([location, items]) => ({ location, items })),
    }));
}

export function formatDisplayDate(value: string) {
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
