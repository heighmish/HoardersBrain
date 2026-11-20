import Index from "@/app/index";
import ThemeSettingsSheet from "@/app/ThemeSettingsSheet";
import { THEME_SETTINGS } from "@/constants/CacheKeys";
import { createTestDb } from "@/testing/db";
import { CharacterProvider } from "@/stores/CharacterContext";
import { ThemeProvider } from "@/stores/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { StyleSheet } from "react-native";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("expo-router", () => ({ Redirect: () => null }));

const mockDb: { current?: ReturnType<typeof createTestDb> } = {};

jest.mock("@/db/DatabaseProvider", () => ({
  useDatabase: () => mockDb.current,
}));

let storedSettings: string | null = null;

beforeEach(() => {
  mockDb.current = createTestDb();
  storedSettings = null;
  (AsyncStorage.getItem as jest.Mock).mockImplementation(
    async (key: string) => (key === THEME_SETTINGS ? storedSettings : null),
  );
});

afterEach(() => {
  (AsyncStorage.getItem as jest.Mock).mockClear();
  (AsyncStorage.setItem as jest.Mock).mockClear();
});

const storedTheme = (settings: Record<string, unknown>) => {
  storedSettings = JSON.stringify(settings);
};

const renderSheet = async () => {
  await render(
    <ThemeProvider>
      <ThemeSettingsSheet />
    </ThemeProvider>,
  );
};

const renderCreationScreen = async () => {
  await render(
    <ThemeProvider>
      <CharacterProvider>
        <Index />
      </CharacterProvider>
    </ThemeProvider>,
  );
};

describe("ThemeSettingsSheet", () => {
  test("opens on the default preset in system mode", async () => {
    await renderSheet();
    expect(await screen.findByText("Mind Flayer · System")).toBeTruthy();
    expect(screen.getByText("Dress the chest. Suit the mind.")).toBeTruthy();
    expect(screen.getByText("Dracula")).toBeTruthy();
    expect(screen.getByText("Tokyo Night")).toBeTruthy();
    expect(screen.getByText("Catppuccin")).toBeTruthy();
    expect(screen.getByText("Nord")).toBeTruthy();
    expect(screen.getByText("Gruvbox")).toBeTruthy();
    expect(screen.getByTestId("theme-mode-light")).toBeTruthy();
    expect(screen.getByTestId("theme-mode-dark")).toBeTruthy();
  });

  test("renders without token crashes in dark mode", async () => {
    storedTheme({ presetId: "gruvbox", mode: "dark", customPalettes: [] });
    await renderSheet();
    expect(await screen.findByText("Gruvbox · Dark")).toBeTruthy();
    expect(screen.getByText("Dracula")).toBeTruthy();
  });

  test("switching the mode chip updates the state line", async () => {
    await renderSheet();
    await screen.findByText("Mind Flayer · System");
    fireEvent.press(screen.getByTestId("theme-mode-dark"));
    await screen.findByText("Mind Flayer · Dark");
    fireEvent.press(screen.getByTestId("theme-mode-light"));
    await screen.findByText("Mind Flayer · Light");
  });

  test("switching the preset updates the state line", async () => {
    await renderSheet();
    await screen.findByText("Mind Flayer · System");
    fireEvent.press(screen.getByTestId("theme-preset-dracula"));
    await screen.findByText("Dracula · System");
  });

  test("creates, saves, and selects a custom palette", async () => {
    storedTheme({ presetId: "mind-flayer", mode: "dark", customPalettes: [] });
    await renderSheet();
    await screen.findByText("Mind Flayer · Dark");

    fireEvent.press(screen.getByTestId("new-custom-palette"));
    const nameInput = await screen.findByTestId("custom-palette-name-input");
    const saveButton = screen.getByTestId("save-custom-palette");
    expect(saveButton.props.accessibilityState.disabled).toBe(true);

    await act(async () => {
      fireEvent.changeText(nameInput, "My Hoard");
    });
    expect(
      screen.getByTestId("save-custom-palette").props.accessibilityState
        .disabled,
    ).toBe(false);
    fireEvent.press(saveButton);

    await waitFor(() => {
      expect(screen.getByText("My Hoard · Dark")).toBeTruthy();
    });
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      THEME_SETTINGS,
      expect.stringMatching(/"presetId":"custom:/),
    );
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      THEME_SETTINGS,
      expect.stringMatching(/"name":"My Hoard"/),
    );
  });
});

describe("character creation screen", () => {
  test("renders in light mode with flavor copy", async () => {
    await renderCreationScreen();
    expect(
      await screen.findByText("Please create a character"),
    ).toBeTruthy();
    expect(
      screen.getByText("Every great hoard begins with a mind."),
    ).toBeTruthy();
    expect(screen.getByTestId("character-name-input")).toBeTruthy();
    expect(screen.getByTestId("create-character-button")).toBeTruthy();
  });

  test("follows a resolved dark mode for copy colors", async () => {
    storedTheme({ presetId: "mind-flayer", mode: "dark", customPalettes: [] });
    await renderCreationScreen();
    const caption = await screen.findByText(
      "Every great hoard begins with a mind.",
    );
    expect(StyleSheet.flatten(caption.props.style).color).toBe("#FF79C6");
  });

  test("follows a resolved light mode for copy colors", async () => {
    storedTheme({ presetId: "mind-flayer", mode: "light", customPalettes: [] });
    await renderCreationScreen();
    const caption = await screen.findByText(
      "Every great hoard begins with a mind.",
    );
    expect(StyleSheet.flatten(caption.props.style).color).toBe("#C32293");
  });
});
