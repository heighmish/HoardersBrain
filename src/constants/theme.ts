import { TextStyle } from "react-native";

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export type Spacing = (typeof spacing)[keyof typeof spacing];

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
} as const;

export const shadows = {
  card: "0 1px 2px rgba(0, 0, 0, 0.05)",
  raised: "0 4px 12px rgba(0, 0, 0, 0.10)",
} as const;

export const motion = {
  fast: 150,
  base: 250,
  slow: 400,
} as const;

export type Motion = (typeof motion)[keyof typeof motion];

export const layout = {
  touchMin: 44,
  controlSm: 36,
  controlMd: 50,
  fab: 52,
  searchPillMin: 48,
  hairline: 1,
  contentMaxWidth: 640,
  icon: {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 24,
  },
} as const;

export const opacity = {
  pressed: 0.7,
  pressedSubtle: 0.6,
  disabled: 0.4,
} as const;

export type ThemeMode = "system" | "light" | "dark";

export type ResolvedThemeMode = "light" | "dark";

export type PaletteSemantics = {
  background: string;
  surface: string;
  text: string;
  textMuted: string;
  accent: string;
  accentSecondary: string;
  border: string;
  success: string;
  warning: string;
  error: string;
};

export type ThemeColors = PaletteSemantics & {
  accentText: string;
  scrim: string;
};

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const value = hex.replace("#", "");
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
};

const channelLuminance = (channel: number): number => {
  const scaled = channel / 255;
  return scaled <= 0.03928
    ? scaled / 12.92
    : Math.pow((scaled + 0.055) / 1.055, 2.4);
};

export const readableTextColor = (hex: string): string => {
  const { r, g, b } = hexToRgb(hex);
  const luminance =
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b);
  return luminance > 0.2 ? "#1B1B24" : "#FFFFFF";
};

export const buildThemeColors = (
  palette: PaletteSemantics,
): ThemeColors => ({
  ...palette,
  accentText: readableTextColor(palette.accent),
  scrim: "rgba(0, 0, 0, 0.4)",
});

export const buildTypography = (colors: ThemeColors) =>
  ({
    largeTitle: { fontSize: 34, fontWeight: "700", color: colors.text },
    title: { fontSize: 22, fontWeight: "600", color: colors.text },
    headline: { fontSize: 17, fontWeight: "600", color: colors.text },
    body: { fontSize: 17, fontWeight: "400", color: colors.text },
    subhead: { fontSize: 15, fontWeight: "400", color: colors.textMuted },
    caption: { fontSize: 12, fontWeight: "400", color: colors.textMuted },
  }) satisfies Record<string, TextStyle>;

export type ThemeTypography = ReturnType<typeof buildTypography>;

const hexPattern = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

export const isHexColor = (value: string): boolean =>
  hexPattern.test(value.trim());

export const normalizeHex = (value: string): string => {
  const trimmed = value.trim().replace("#", "").toUpperCase();
  const expanded =
    trimmed.length === 3
      ? trimmed
          .split("")
          .map((char) => char + char)
          .join("")
      : trimmed;
  return `#${expanded}`;
};
