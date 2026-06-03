import { useCallback, useEffect, useState } from "react";
import * as Location from "expo-location";
import type { City } from "../types/app";
import {
  inferAllowedCityNameFromCoords,
  inferAllowedCityNameFromText,
  matchCityFromList,
} from "../utils/locationCity";

type UseDetectedCityResult = {
  detectedCity: City | null;
  detectedCityId: string | null;
  isDetecting: boolean;
  detect: () => Promise<void>;
};

export function useDetectedCity(cities: City[]): UseDetectedCityResult {
  const [detectedCityId, setDetectedCityId] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  const detect = useCallback(async () => {
    if (!cities.length) return;

    setIsDetecting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = position.coords;
      const fromCoords = inferAllowedCityNameFromCoords(latitude, longitude);
      if (fromCoords) {
        const matched = cities.find((city) => city.name === fromCoords);
        if (matched) {
          setDetectedCityId(matched.id);
          return;
        }
      }

      const places = await Location.reverseGeocodeAsync({ latitude, longitude });
      const place = places[0];
      const label = [place?.city, place?.subregion, place?.district, place?.region]
        .filter(Boolean)
        .join(" ");
      const fromText = inferAllowedCityNameFromText(label);
      const matched = matchCityFromList(fromText ?? label, cities);
      if (matched) {
        setDetectedCityId(matched.id);
      }
    } catch {
      // Keep previous/default city when location is unavailable.
    } finally {
      setIsDetecting(false);
    }
  }, [cities]);

  useEffect(() => {
    void detect();
  }, [detect]);

  const detectedCity = cities.find((city) => city.id === detectedCityId) ?? null;

  return {
    detectedCity,
    detectedCityId,
    isDetecting,
    detect,
  };
}
