import { THEME_SETTINGS } from "@/constants/CacheKeys";
import {
  PaletteSemantics,
  ResolvedThemeMode,
  ThemeColors,
  ThemeMode,
  ThemeTypography,
  buildThemeColors,
  buildTypography,
  isHexColor,
  layout,
  motion,
  opacity,
  radius,
  shadows,
  spacing,
} from "@/constants/theme";
import {
  CUSTOM_PALETTE_PREFIX,
  CustomPalette,
  DEFAULT_PRESET_ID,
  defaultPreset,
  findCustomPalette,
  findThemePreset,
} from "@/constants/themePresets";
import Storage from "expo-sqlite/kv-store";
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Appearance, useColorScheme } from "react-native";

type PersistedThemeSettings = {
  presetId: string;
  mode: ThemeMode;
  customPalettes: CustomPalette[];
};

const DEFAULT_THEME_SETTINGS: PersistedThemeSettings = {
  presetId: DEFAULT_PRESET_ID,
  mode: "system",
  customPalettes: [],
};

type ThemeContextType = {
  presetId: string;
  presetName: string;
  mode: ThemeMode;
  resolvedMode: ResolvedThemeMode;
  colors: ThemeColors;
  type: ThemeTypography;
  spacing: typeof spacing;
  radius: typeof radius;
  shadows: typeof shadows;
  motion: typeof motion;
  layout: typeof layout;
  opacity: typeof opacity;
  customPalettes: CustomPalette[];
  selectPreset: (presetId: string) => void;
  setMode: (mode: ThemeMode) => void;
  upsertCustomPalette: (palette: CustomPalette) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_MODES: readonly ThemeMode[] = ["system", "light", "dark"];

const isThemeMode = (value: unknown): value is ThemeMode =>
  typeof value === "string" && THEME_MODES.includes(value as ThemeMode);

const isPaletteSemantics = (value: unknown): value is PaletteSemantics => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return ["background", "surface", "text", "textMuted", "accent", "accentSecondary", "border", "success", "warning", "error"].every(
    (key) => typeof candidate[key] === "string" && isHexColor(candidate[key] as string),
  );
};

const parseStoredSettings = (stored: string): PersistedThemeSettings => {
  const parsed: unknown = JSON.parse(stored);
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("Stored theme settings are not an object");
  }
  const candidate = parsed as Record<string, unknown>;
  const customPalettes = Array.isArray(candidate.customPalettes)
    ? candidate.customPalettes.filter(
        (palette): palette is CustomPalette =>
          typeof palette === "object" &&
          palette !== null &&
          typeof (palette as Record<string, unknown>).id === "string" &&
          typeof (palette as Record<string, unknown>).name === "string" &&
          isPaletteSemantics(palette),
      )
    : [];
  const rawPresetId =
    typeof candidate.presetId === "string"
      ? candidate.presetId
      : DEFAULT_PRESET_ID;
  const presetExists =
    findThemePreset(rawPresetId) !== undefined ||
    findCustomPalette(rawPresetId, customPalettes) !== undefined;
  return {
    presetId: presetExists ? rawPresetId : DEFAULT_PRESET_ID,
    mode: isThemeMode(candidate.mode) ? candidate.mode : "system",
    customPalettes,
  };
};

const resolvePalette = (
  presetId: string,
  resolvedMode: ResolvedThemeMode,
  customPalettes: readonly CustomPalette[],
): { name: string; semantics: PaletteSemantics } => {
  const custom = findCustomPalette(presetId, customPalettes);
  if (custom !== undefined) {
    const { id: _id, name, ...semantics } = custom;
    return { name, semantics };
  }
  const preset =
    presetId.startsWith(CUSTOM_PALETTE_PREFIX)
      ? defaultPreset
      : (findThemePreset(presetId) ?? defaultPreset);
  return { name: preset.name, semantics: preset[resolvedMode] };
};

const loadStoredSettings = (): PersistedThemeSettings => {
  try {
    const stored = Storage.getItemSync(THEME_SETTINGS);
    if (stored !== null) {
      return parseStoredSettings(stored);
    }
  } catch (error) {
    console.error("[ThemeContext]: Error loading theme settings", error);
  }
  return DEFAULT_THEME_SETTINGS;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [settings, setSettings] =
    useState<PersistedThemeSettings>(loadStoredSettings);
  const systemColorScheme = useColorScheme();
  const didMountRef = useRef(false);

  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }
    try {
      Storage.setItemSync(THEME_SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error("[ThemeContext]: Error persisting theme settings", error);
    }
  }, [settings]);

  useEffect(() => {
    Appearance.setColorScheme(
      settings.mode === "system" ? "auto" : settings.mode,
    );
  }, [settings.mode]);

  const resolvedMode: ResolvedThemeMode =
    settings.mode === "system"
      ? systemColorScheme === "dark"
        ? "dark"
        : "light"
      : settings.mode;

  const selectPreset = useCallback((presetId: string) => {
    setSettings((previous) => ({ ...previous, presetId }));
  }, []);

  const setMode = useCallback((mode: ThemeMode) => {
    setSettings((previous) => ({ ...previous, mode }));
  }, []);

  const upsertCustomPalette = useCallback((nextPalette: CustomPalette) => {
    setSettings((previous) => {
      const exists = previous.customPalettes.some(
        (existing) => existing.id === nextPalette.id,
      );
      return {
        ...previous,
        customPalettes: exists
          ? previous.customPalettes.map((existing) =>
              existing.id === nextPalette.id ? nextPalette : existing,
            )
          : [...previous.customPalettes, nextPalette],
      };
    });
  }, []);

  const value = useMemo<ThemeContextType>(() => {
    const palette = resolvePalette(
      settings.presetId,
      resolvedMode,
      settings.customPalettes,
    );
    const colors = buildThemeColors(palette.semantics);
    return {
      presetId: settings.presetId,
      presetName: palette.name,
      mode: settings.mode,
      resolvedMode,
      colors,
      type: buildTypography(colors),
      spacing,
      radius,
      shadows,
      motion,
      layout,
      opacity,
      customPalettes: settings.customPalettes,
      selectPreset,
      setMode,
      upsertCustomPalette,
    };
  }, [
    settings.presetId,
    settings.mode,
    settings.customPalettes,
    resolvedMode,
    selectPreset,
    setMode,
    upsertCustomPalette,
  ]);

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error("Hook must be used within a theme provider");
  }
  return context;
};
