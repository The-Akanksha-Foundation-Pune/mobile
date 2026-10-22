/**
 * Design tokens for the CaptureAkanksha layout (light only; the design has no dark mode).
 * Values come straight from the Stitch export (tailwind config) so the app matches the design.
 */
export const captureLight = {
  surface: "#f9f9ff",
  surfaceCard: "#ffffff",
  surfaceContainerLow: "#f1f3ff",
  surfaceContainer: "#e9edff",
  surfaceContainerHigh: "#e0e8ff",
  surfaceContainerHighest: "#dbe2f9",
  onSurface: "#141b2c",
  onSurfaceVariant: "#5c403b",
  primary: "#b50c08",
  primaryContainer: "#d92d20",
  primaryFixed: "#ffdad5",
  onPrimary: "#ffffff",
  onPrimaryFixedVariant: "#930002",
  secondary: "#8d4f00",
  secondaryFixed: "#ffdcc0",
  onSecondaryFixed: "#2d1600",
  tertiary: "#005e90",
  tertiaryFixed: "#cde5ff",
  onTertiaryFixed: "#001d32",
  outline: "#906f6a",
  outlineVariant: "#e5bdb7",
  inverseSurface: "#293041",
  inverseOnSurface: "#edf0ff",
  statusSuccess: "#039855",
  statusDanger: "#D92D20",
  statusWarning: "#F79009",
  statusInfo: "#026AA2",
  brandSun: "#FBDA1D",
  /** Deep navy slate used for text, active filter chips and secondary buttons. */
  neutral: "#101828",
  /** Soft borders on cards (rgba of the neutral). */
  cardBorder: "rgba(16, 24, 40, 0.06)",
  /** Border on selectable filter chips. */
  chipBorder: "#E2E8F0",
  /** Text on the soft-gold "pending" badge. */
  pendingText: "#B54708",
  /** Pressed state of the primary button. */
  primaryPressed: "#C92519",
};

export const captureLayout = {
  maxWidth: 390,
  /** Widest the content column gets on tablets; the background still fills the screen. */
  contentMaxWidth: 720,
  /** Content at least this wide counts as a tablet layout. */
  tabletMinWidth: 600,
  gutter: 16,
  gutterMobile: 12,
  headerHeight: 64,
  navHeight: 56,
  /** Hard floor for primary touch targets (design system: 48x48). */
  touchTarget: 48,
  fabSize: 56,
  /** Corner radii from the design system. */
  radius: { sm: 4, md: 12, default: 8, lg: 16, xl: 24, full: 9999 },
  /** 8px base grid. */
  space: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
  control: { buttonHeight: 48, inputHeight: 48, chipHeight: 36, badgeHeight: 24 },
};

/** Warm, navy-tinted elevation levels (React Native shadow props). */
export const captureShadow = {
  level1: { shadowColor: "#101828", shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  level2: { shadowColor: "#101828", shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  level3: { shadowColor: "#101828", shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
};

/** Font families loaded in App.tsx (Inter for text, Plus Jakarta Sans for headings). */
export const captureFonts = {
  inter: "Inter_400Regular",
  interSemi: "Inter_600SemiBold",
  interBold: "Inter_700Bold",
  headSemi: "PlusJakartaSans_600SemiBold",
  headBold: "PlusJakartaSans_700Bold",
  headExtra: "PlusJakartaSans_800ExtraBold",
};

/** Text styles, same scale as the Stitch design. */
export const captureType = {
  displayLgMobile: { fontFamily: captureFonts.headExtra, fontSize: 32, lineHeight: 40, letterSpacing: -0.64 },
  headlineLg: { fontFamily: captureFonts.headBold, fontSize: 28, lineHeight: 36, letterSpacing: -0.42 },
  headlineMd: { fontFamily: captureFonts.headBold, fontSize: 22, lineHeight: 28, letterSpacing: -0.22 },
  headlineSm: { fontFamily: captureFonts.headBold, fontSize: 18, lineHeight: 24, letterSpacing: 0 },
  bodyLg: { fontFamily: captureFonts.inter, fontSize: 16, lineHeight: 24 },
  bodyMd: { fontFamily: captureFonts.inter, fontSize: 14, lineHeight: 20 },
  bodySm: { fontFamily: captureFonts.inter, fontSize: 12, lineHeight: 18 },
  labelLg: { fontFamily: captureFonts.interSemi, fontSize: 14, lineHeight: 20, letterSpacing: 0.14 },
  labelMd: { fontFamily: captureFonts.interSemi, fontSize: 12, lineHeight: 16, letterSpacing: 0.24 },
  labelSm: { fontFamily: captureFonts.interBold, fontSize: 10, lineHeight: 14, letterSpacing: 0.4 },
} as const;

/** Semantic tones used for status text and badges. */
export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";

export function statusToneColor(c: typeof captureLight, tone: StatusTone): string {
  switch (tone) {
    case "success":
      return c.statusSuccess;
    case "warning":
      return c.statusWarning;
    case "danger":
      return c.statusDanger;
    case "info":
      return c.tertiary;
    default:
      return c.onSurfaceVariant;
  }
}
