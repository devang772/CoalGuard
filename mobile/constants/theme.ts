export const COLORS = {
  // Brand colors - Minimal green accent design system
  primary: "#10b981", // Mint green accent
  primaryDark: "#059669",
  primaryLight: "#34d399",
  primaryBright: "#00e699",
  primaryGlow: "rgba(16, 185, 129, 0.15)",

  secondary: "#38bdf8", // Subtle cyan
  accent: "#2dd4bf", // Bright teal

  // Ultra-dark stealth background & surface tokens
  background: "#050807", // Deep pitch-black background
  backgroundSecondary: "#090d0b",
  surface: "#0d1412", // Dark sleek card surface
  surfaceStrong: "#121a17", // Elevated panel
  surfaceElevated: "#17221e",
  card: "#0d1412",

  // Borders
  border: "#182621",
  borderSubtle: "#121c18",
  borderHighlight: "#10b981",

  // Typography
  text: "#ffffff",
  textMuted: "#8a9e97",
  textSubtle: "#4c5e57",
  textInverse: "#051811",

  // Status & Severity Indicators
  safe: "#10b981", // Compliant / Passed
  warning: "#f59e0b", // Warning / Medium Severity
  destructive: "#ef4444", // Critical / Non-Compliant
  info: "#38bdf8", // Informational / Pending

  // Severity Tiers
  severity: {
    CRITICAL: "#ef4444",
    HIGH: "#f97316",
    MEDIUM: "#f59e0b",
    LOW: "#10b981",
  },

  // Overlays
  overlay: "rgba(5, 8, 7, 0.90)",
  glass: "#0d1412",
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 40,
};

export const RADIUS = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  full: 9999,
};

export const SHADOWS = {
  glowPrimary: {
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  glowDanger: {
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  card: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 4,
  },
};
