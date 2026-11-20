import { THEME_SETTINGS } from "@/constants/CacheKeys";
import { defaultPreset, findThemePreset } from "@/constants/themePresets";
import { ThemeProvider, useTheme } from "@/stores/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { Pressable, Text, useColorScheme } from "react-native";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

let storedSettings: string | null = null;

const mockSystemScheme = (scheme: "light" | "dark" | null) => {
  (useColorScheme as jest.Mock).mockReturnValue(scheme);
};

beforeEach(() => {
  storedSettings = null;
  mockSystemScheme("light");
  (AsyncStorage.getItem as jest.Mock).mockImplementation(
    async (key: string) => (key === THEME_SETTINGS ? storedSettings : null),
  );
});

afterEach(() => {
  (useColorScheme as jest.Mock).mockClear();
  mockSystemScheme("light");
  (AsyncStorage.getItem as jest.Mock).mockClear();
  (AsyncStorage.setItem as jest.Mock).mockClear();
});

const ThemeProbe = () => {
  const theme = useTheme();
  return (
    <>
      <Text testID="probe-preset-name">{theme.presetName}</Text>
      <Text testID="probe-mode">{theme.resolvedMode}</Text>
      <Text testID="probe-background">{theme.colors.background}</Text>
      <Pressable
        testID="probe-select-dracula"
        onPress={() => theme.selectPreset("dracula")}
      />
    </>
  );
};

const renderTheme = async () => {
  await render(
    <ThemeProvider>
      <ThemeProbe />
    </ThemeProvider>,
  );
  await screen.findByTestId("probe-mode");
};

const stored = (settings: Record<string, unknown>) => {
  storedSettings = JSON.stringify(settings);
};

describe("ThemeProvider mode resolution", () => {
  test("system mode follows a dark color scheme", async () => {
    mockSystemScheme("dark");
    await renderTheme();
    expect(screen.getByTestId("probe-mode").props.children).toBe("dark");
  });

  test("system mode follows a light color scheme", async () => {
    mockSystemScheme("light");
    await renderTheme();
    expect(screen.getByTestId("probe-mode").props.children).toBe("light");
  });

  test("system mode falls back to light when the scheme is unavailable", async () => {
    mockSystemScheme(null);
    await renderTheme();
    expect(screen.getByTestId("probe-mode").props.children).toBe("light");
  });

  test("a persisted dark override beats a light system scheme", async () => {
    stored({ presetId: "dracula", mode: "dark", customPalettes: [] });
    mockSystemScheme("light");
    await renderTheme();
    expect(screen.getByTestId("probe-mode").props.children).toBe("dark");
  });

  test("a persisted light override beats a dark system scheme", async () => {
    stored({ presetId: "dracula", mode: "light", customPalettes: [] });
    mockSystemScheme("dark");
    await renderTheme();
    expect(screen.getByTestId("probe-mode").props.children).toBe("light");
  });

  test("a dark override resolves the preset's dark variant", async () => {
    stored({ presetId: "dracula", mode: "dark", customPalettes: [] });
    mockSystemScheme("light");
    await renderTheme();
    const dracula = findThemePreset("dracula");
    expect(dracula).toBeDefined();
    expect(screen.getByTestId("probe-preset-name").props.children).toBe(
      "Dracula",
    );
    expect(screen.getByTestId("probe-background").props.children).toBe(
      dracula?.dark.background,
    );
  });

  test("invalid stored JSON falls back to the default preset and system mode", async () => {
    storedSettings = "not valid json {";
    mockSystemScheme("dark");
    await renderTheme();
    expect(screen.getByTestId("probe-preset-name").props.children).toBe(
      defaultPreset.name,
    );
    expect(screen.getByTestId("probe-mode").props.children).toBe("dark");
    expect(screen.getByTestId("probe-background").props.children).toBe(
      defaultPreset.dark.background,
    );
  });

  test("stored settings with wrong shapes fall back per field", async () => {
    stored({ presetId: 42, mode: "neon", customPalettes: "not-a-list" });
    mockSystemScheme("light");
    await renderTheme();
    expect(screen.getByTestId("probe-preset-name").props.children).toBe(
      defaultPreset.name,
    );
    expect(screen.getByTestId("probe-mode").props.children).toBe("light");
  });

  test("an unknown preset id resolves default preset colors", async () => {
    stored({ presetId: "ghost", mode: "light", customPalettes: [] });
    mockSystemScheme("dark");
    await renderTheme();
    expect(screen.getByTestId("probe-preset-name").props.children).toBe(
      defaultPreset.name,
    );
    expect(screen.getByTestId("probe-background").props.children).toBe(
      defaultPreset.light.background,
    );
  });

  test("a custom palette id with no saved palette resolves default colors", async () => {
    stored({ presetId: "custom:gone", mode: "dark", customPalettes: [] });
    mockSystemScheme("light");
    await renderTheme();
    expect(screen.getByTestId("probe-preset-name").props.children).toBe(
      defaultPreset.name,
    );
    expect(screen.getByTestId("probe-background").props.children).toBe(
      defaultPreset.dark.background,
    );
  });

  test("selecting a preset persists the new settings", async () => {
    mockSystemScheme("light");
    await renderTheme();
    fireEvent.press(screen.getByTestId("probe-select-dracula"));
    await screen.findByText("Dracula");
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      THEME_SETTINGS,
      expect.stringMatching(/"presetId":"dracula"/),
    );
  });
});
