import { useWindowDimensions } from "react-native";
import { captureLayout, captureLight, captureShadow, captureType } from "./capture";

/** One hook for colors, type, spacing and shadows. The design is light-only. */
export function useCaptureTheme() {
  return { c: captureLight, type: captureType, layout: captureLayout, shadow: captureShadow };
}

/** Width of the centered content column: the window width, capped on tablets. */
export function useContentWidth() {
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width, captureLayout.contentMaxWidth);
  return { contentWidth, isTablet: contentWidth >= captureLayout.tabletMinWidth };
}

export type CaptureColors = typeof captureLight;
