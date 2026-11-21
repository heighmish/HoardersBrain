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
  motion,
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { Appearance, useColorScheme } from "react-native";

type PersistedThemeSettings = {
  presetId: string;
  mode: ThemeMode;
  customPalettes: CustomPalette[];
};

type ThemeState =
  | { status: "loading" }
  | ({ status: "ready" } & PersistedThemeSettings);

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
  return {
    presetId:
      typeof candidate.presetId === "string"
        ? candidate.presetId
        : DEFAULT_PRESET_ID,
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

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [state, setState] = useState<ThemeState>({ status: "loading" });
  const systemColorScheme = useColorScheme();

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_SETTINGS);
        if (stored !== null) {
          const settings = parseStoredSettings(stored);
          setState({ status: "ready", ...settings });
          return;
        }
      } catch (error) {
        console.error("[ThemeContext]: Error loading theme settings", error);
      }
      setState({
        status: "ready",
        presetId: DEFAULT_PRESET_ID,
        mode: "system",
        customPalettes: [],
      });
    };
    loadSettings();
  }, []);

  useEffect(() => {
    if (state.status === "loading") {
      return;
    }
    const settings: PersistedThemeSettings = {
      presetId: state.presetId,
      mode: state.mode,
      customPalettes: state.customPalettes,
    };
    AsyncStorage.setItem(THEME_SETTINGS, JSON.stringify(settings)).catch(
      (error: unknown) => {
        console.error("[ThemeContext]: Error persisting theme settings", error);
      },
    );
  }, [state]);

  const activeMode = state.status === "ready" ? state.mode : "system";

  useEffect(() => {
    Appearance.setColorScheme(
      activeMode === "system" ? "auto" : activeMode,
    );
  }, [activeMode]);

  if (state.status === "loading") {
    return null;
  }

  const resolvedMode: ResolvedThemeMode =
    state.mode === "system"
      ? systemColorScheme === "dark"
        ? "dark"
        : "light"
      : state.mode;

  const palette = resolvePalette(
    state.presetId,
    resolvedMode,
    state.customPalettes,
  );
  const colors = buildThemeColors(palette.semantics);

  const updateSettings = (partial: Partial<PersistedThemeSettings>) => {
    setState((previous) =>
      previous.status === "loading" ? previous : { ...previous, ...partial },
    );
  };

  const selectPreset = (presetId: string) => {
    updateSettings({ presetId });
  };

  const setMode = (mode: ThemeMode) => {
    updateSettings({ mode });
  };

  const upsertCustomPalette = (palette: CustomPalette) => {
    setState((previous) => {
      if (previous.status === "loading") {
        return previous;
      }
      const exists = previous.customPalettes.some(
        (existing) => existing.id === palette.id,
      );
      return {
        ...previous,
        customPalettes: exists
          ? previous.customPalettes.map((existing) =>
              existing.id === palette.id ? palette : existing,
            )
          : [...previous.customPalettes, palette],
      };
    });
  };

  return (
    <ThemeContext.Provider
      value={{
        presetId: state.presetId,
        presetName: palette.name,
        mode: state.mode,
        resolvedMode,
        colors,
        type: buildTypography(colors),
        spacing,
        radius,
        shadows,
        motion,
        customPalettes: state.customPalettes,
        selectPreset,
        setMode,
        upsertCustomPalette,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);

  if (context === undefined) {
    throw new Error("Hook must be used within a theme provider");
  }
  return context;
};
