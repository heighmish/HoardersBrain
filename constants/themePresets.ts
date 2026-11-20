import { PaletteSemantics } from "@/constants/theme";

export type CustomPalette = { id: string; name: string } & PaletteSemantics;

export type ThemePreset = {
  id: string;
  name: string;
  light: PaletteSemantics;
  dark: PaletteSemantics;
};

const mindFlayerPreset: ThemePreset = {
  id: "mind-flayer",
  name: "Mind Flayer",
  light: {
    background: "#F6F5FB",
    surface: "#FFFFFF",
    text: "#282A36",
    textMuted: "#6272A4",
    accent: "#9529E0",
    accentSecondary: "#C32293",
    border: "#E4E2F3",
    success: "#50FA7B",
    warning: "#F1FA8C",
    error: "#FF5555",
  },
  dark: {
    background: "#21222C",
    surface: "#282A36",
    text: "#F8F8F2",
    textMuted: "#6272A4",
    accent: "#BD93F9",
    accentSecondary: "#FF79C6",
    border: "#44475A",
    success: "#50FA7B",
    warning: "#F1FA8C",
    error: "#FF5555",
  },
};

const basicLight = (
  accent: string,
  accentSecondary: string,
): PaletteSemantics => ({
  background: "#F7F7FA",
  surface: "#FFFFFF",
  text: "#1C1C1E",
  textMuted: "#8E8E93",
  accent,
  accentSecondary,
  border: "#D1D1D6",
  success: "#34C759",
  warning: "#FFCC00",
  error: "#FF3B30",
});

const draculaPreset: ThemePreset = {
  id: "dracula",
  name: "Dracula",
  light: basicLight("#791EB8", "#B81E8B"),
  dark: {
    background: "#282A36",
    surface: "#44475A",
    text: "#F8F8F2",
    textMuted: "#6272A4",
    accent: "#BD93F9",
    accentSecondary: "#FF79C6",
    border: "#6272A4",
    success: "#50FA7B",
    warning: "#F1FA8C",
    error: "#FF5555",
  },
};

const tokyoNightPreset: ThemePreset = {
  id: "tokyo-night",
  name: "Tokyo Night",
  light: basicLight("#1E4FB8", "#551EB8"),
  dark: {
    background: "#24283B",
    surface: "#292E42",
    text: "#C0CAF5",
    textMuted: "#565F89",
    accent: "#7AA2F7",
    accentSecondary: "#BB9AF7",
    border: "#3B4261",
    success: "#9ECE6A",
    warning: "#E0AF68",
    error: "#F7768E",
  },
};

const catppuccinPreset: ThemePreset = {
  id: "catppuccin",
  name: "Catppuccin",
  light: {
    background: "#EFF1F5",
    surface: "#E6E9EF",
    text: "#4C4F69",
    textMuted: "#6C6F85",
    accent: "#8839EF",
    accentSecondary: "#EA76CB",
    border: "#CCD0DA",
    success: "#40A02B",
    warning: "#DF8E1D",
    error: "#D20F39",
  },
  dark: {
    background: "#1E1E2E",
    surface: "#313244",
    text: "#CDD6F4",
    textMuted: "#A6ADC8",
    accent: "#CBA6F7",
    accentSecondary: "#F5C2E7",
    border: "#585B70",
    success: "#A6E3A1",
    warning: "#F9E2AF",
    error: "#F38BA8",
  },
};

const nordPreset: ThemePreset = {
  id: "nord",
  name: "Nord",
  light: {
    background: "#ECEFF4",
    surface: "#E5E9F0",
    text: "#2E3440",
    textMuted: "#4C566A",
    accent: "#5E81AC",
    accentSecondary: "#B48EAD",
    border: "#4C566A",
    success: "#A3BE8C",
    warning: "#EBCB8B",
    error: "#BF616A",
  },
  dark: {
    background: "#2E3440",
    surface: "#3B4252",
    text: "#ECEFF4",
    textMuted: "#D8DEE9",
    accent: "#88C0D0",
    accentSecondary: "#B48EAD",
    border: "#4C566A",
    success: "#A3BE8C",
    warning: "#EBCB8B",
    error: "#BF616A",
  },
};

const gruvboxPreset: ThemePreset = {
  id: "gruvbox",
  name: "Gruvbox",
  light: {
    background: "#FBF1C7",
    surface: "#EBDBB2",
    text: "#3C3836",
    textMuted: "#928374",
    accent: "#AF3A03",
    accentSecondary: "#8F3F71",
    border: "#BDAE93",
    success: "#79740E",
    warning: "#B57614",
    error: "#9D0006",
  },
  dark: {
    background: "#282828",
    surface: "#3C3836",
    text: "#EBDBB2",
    textMuted: "#928374",
    accent: "#FE8019",
    accentSecondary: "#D3869B",
    border: "#665C54",
    success: "#B8BB26",
    warning: "#FABD2F",
    error: "#FB4934",
  },
};

export const themePresets: readonly ThemePreset[] = [
  mindFlayerPreset,
  draculaPreset,
  tokyoNightPreset,
  catppuccinPreset,
  nordPreset,
  gruvboxPreset,
];

export const defaultPreset: ThemePreset = mindFlayerPreset;

export const DEFAULT_PRESET_ID = defaultPreset.id;

export const CUSTOM_PALETTE_PREFIX = "custom:";

export const findThemePreset = (
  presetId: string,
): ThemePreset | undefined =>
  themePresets.find((preset) => preset.id === presetId);

export const findCustomPalette = (
  presetId: string,
  customPalettes: readonly CustomPalette[],
): CustomPalette | undefined => {
  if (!presetId.startsWith(CUSTOM_PALETTE_PREFIX)) {
    return undefined;
  }
  const paletteId = presetId.slice(CUSTOM_PALETTE_PREFIX.length);
  return customPalettes.find((palette) => palette.id === paletteId);
};

export const customPalettePresetId = (paletteId: string): string =>
  `${CUSTOM_PALETTE_PREFIX}${paletteId}`;
