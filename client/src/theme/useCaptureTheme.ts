import { captureLayout, captureLight, captureShadow, captureType } from "./capture";

/** One hook for colors, type, spacing and shadows. The design is light-only. */
export function useCaptureTheme() {
  return { c: captureLight, type: captureType, layout: captureLayout, shadow: captureShadow };
}

export type CaptureColors = typeof captureLight;
