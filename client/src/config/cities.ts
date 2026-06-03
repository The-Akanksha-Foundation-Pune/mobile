import type { City } from "../types/app";

export const ALLOWED_CITY_NAMES = ["Mumbai", "Pune", "Nagpur"] as const;

export function filterAllowedCities(cities: City[]): City[] {
  const allowed = new Set<string>(ALLOWED_CITY_NAMES);
  return cities
    .filter((city) => allowed.has(city.name))
    .sort(
      (a, b) =>
        ALLOWED_CITY_NAMES.indexOf(a.name as (typeof ALLOWED_CITY_NAMES)[number]) -
        ALLOWED_CITY_NAMES.indexOf(b.name as (typeof ALLOWED_CITY_NAMES)[number])
    );
}

/** Cities that have at least one mapped cost center (for city → cost center flow). */
export function citiesWithCostCenters(cities: City[], costCenters: { cityId: string | null }[]): City[] {
  const cityIds = new Set(costCenters.map((cc) => cc.cityId).filter(Boolean) as string[]);
  return filterAllowedCities(cities.filter((city) => cityIds.has(city.id)));
}
