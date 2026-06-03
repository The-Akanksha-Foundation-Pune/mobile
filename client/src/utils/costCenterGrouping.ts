import { ALLOWED_CITY_NAMES } from "../config/cities";
import type { CostCenter } from "../types/app";

export type CostCenterCitySection = {
  cityId: string;
  cityName: string;
  data: CostCenter[];
};

function citySortIndex(cityName: string): number {
  const index = ALLOWED_CITY_NAMES.indexOf(cityName as (typeof ALLOWED_CITY_NAMES)[number]);
  return index >= 0 ? index : ALLOWED_CITY_NAMES.length;
}

export function groupCostCentersByCity(costCenters: CostCenter[]): CostCenterCitySection[] {
  const byCity = new Map<string, CostCenterCitySection>();

  for (const center of costCenters) {
    const cityId = center.cityId || "unassigned";
    const cityName = center.cityName?.trim() || "Unassigned";
    const existing = byCity.get(cityId);
    if (existing) {
      existing.data.push(center);
    } else {
      byCity.set(cityId, { cityId, cityName, data: [center] });
    }
  }

  const sections = Array.from(byCity.values());
  for (const section of sections) {
    section.data.sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name) || a.code.localeCompare(b.code)
    );
  }

  return sections.sort(
    (a, b) => citySortIndex(a.cityName) - citySortIndex(b.cityName) || a.cityName.localeCompare(b.cityName)
  );
}
