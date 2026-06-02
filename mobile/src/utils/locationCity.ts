import type { City, EventItem } from "../types/app";
import { ALLOWED_CITY_NAMES } from "../config/cities";

/** Rough metro bounds for allowed Akanksha cities (lat/lon). */
const CITY_BOUNDS: Record<(typeof ALLOWED_CITY_NAMES)[number], { latMin: number; latMax: number; lonMin: number; lonMax: number }> = {
  Mumbai: { latMin: 18.89, latMax: 19.28, lonMin: 72.77, lonMax: 73.05 },
  Pune: { latMin: 18.41, latMax: 18.64, lonMin: 73.75, lonMax: 74.0 },
  Nagpur: { latMin: 20.98, latMax: 21.22, lonMin: 78.95, lonMax: 79.15 },
};

export function normalizeCityLabel(value: string): string {
  return value.trim().toLowerCase();
}

export function inferAllowedCityNameFromText(value?: string | null): (typeof ALLOWED_CITY_NAMES)[number] | null {
  if (!value) return null;
  const text = normalizeCityLabel(value);
  if (text.includes("mumbai") || text.includes("bombay")) return "Mumbai";
  if (text.includes("pune") || text.includes("poona")) return "Pune";
  if (text.includes("nagpur")) return "Nagpur";
  return null;
}

export function inferAllowedCityNameFromCoords(latitude: number, longitude: number): (typeof ALLOWED_CITY_NAMES)[number] | null {
  for (const cityName of ALLOWED_CITY_NAMES) {
    const bounds = CITY_BOUNDS[cityName];
    if (
      latitude >= bounds.latMin &&
      latitude <= bounds.latMax &&
      longitude >= bounds.lonMin &&
      longitude <= bounds.lonMax
    ) {
      return cityName;
    }
  }
  return null;
}

export function matchCityFromList(label: string | null | undefined, cities: City[]): City | null {
  const allowedName = inferAllowedCityNameFromText(label);
  if (!allowedName) return null;
  return cities.find((city) => city.name === allowedName) ?? null;
}

export function sortCitiesWithDefaultFirst(cities: City[], preferredCityId: string | null): City[] {
  if (!preferredCityId) return cities;
  return [...cities].sort((a, b) => {
    if (a.id === preferredCityId) return -1;
    if (b.id === preferredCityId) return 1;
    return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
  });
}

export function getEventCityId(
  event: EventItem,
  costCenterCityById: Map<string, string | null>
): string | null {
  return event.cityId || (event.costCenterId ? costCenterCityById.get(event.costCenterId) ?? null : null) || null;
}

export function sortEventsWithCityFirst(
  events: EventItem[],
  preferredCityId: string | null,
  costCenterCityById: Map<string, string | null>
): EventItem[] {
  if (!preferredCityId) {
    return [...events].sort((a, b) => {
      const dateDiff = b.eventDate.localeCompare(a.eventDate);
      if (dateDiff !== 0) return dateDiff;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }

  return [...events].sort((a, b) => {
    const aLocal = getEventCityId(a, costCenterCityById) === preferredCityId ? 1 : 0;
    const bLocal = getEventCityId(b, costCenterCityById) === preferredCityId ? 1 : 0;
    if (aLocal !== bLocal) return bLocal - aLocal;

    const dateDiff = b.eventDate.localeCompare(a.eventDate);
    if (dateDiff !== 0) return dateDiff;
    return b.createdAt.localeCompare(a.createdAt);
  });
}
