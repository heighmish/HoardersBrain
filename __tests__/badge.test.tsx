import Badge from "@/components/Basic/Badge";
import { THEME_SETTINGS } from "@/constants/CacheKeys";
import { RarityArray } from "@/constants/databaseTypes";
import { rarityColors } from "@/constants/rarity";
import { ThemeProvider } from "@/stores/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { render, screen } from "@testing-library/react-native";
import { ReactNode } from "react";
import { StyleSheet } from "react-native";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

let storedSettings: string | null = null;

beforeEach(() => {
  storedSettings = null;
  (AsyncStorage.getItem as jest.Mock).mockImplementation(
    async (key: string) => (key === THEME_SETTINGS ? storedSettings : null),
  );
});

afterEach(() => {
  (AsyncStorage.getItem as jest.Mock).mockClear();
  (AsyncStorage.setItem as jest.Mock).mockClear();
});

const renderInTheme = async (mode: "light" | "dark", node: ReactNode) => {
  storedSettings = JSON.stringify({
    presetId: "mind-flayer",
    mode,
    customPalettes: [],
  });
  return render(<ThemeProvider>{node}</ThemeProvider>);
};

const labelColor = async (text: string) => {
  const label = await screen.findByText(text);
  const resolved = StyleSheet.flatten(label.props.style);
  if (resolved === null || resolved === undefined) {
    throw new Error("badge label style could not be resolved");
  }
  return resolved.color;
};

describe("Badge", () => {
  test("renders every rarity with its palette color", async () => {
    for (const rarity of RarityArray) {
      const { unmount } = await renderInTheme(
        "dark",
        <Badge
          text={rarity}
          color={rarityColors[rarity]}
          testID="badge-under-test"
        />,
      );
      const badge = await screen.findByTestId("badge-under-test");
      expect(badge.props.style.backgroundColor).toBe(rarityColors[rarity]);
      expect(badge.props.style.borderColor).toBe(rarityColors[rarity]);
      await unmount();
    }
  });

  test("rarity fills pair their text color by luminance", async () => {
    await renderInTheme(
      "dark",
      <Badge text="Common" color={rarityColors.Common} />,
    );
    expect(await labelColor("Common")).toBe("#FFFFFF");
  });

  test("legendary orange pairs dark text for contrast", async () => {
    await renderInTheme(
      "dark",
      <Badge text="Legendary" color={rarityColors.Legendary} />,
    );
    expect(await labelColor("Legendary")).toBe("#1B1B24");
  });

  test("feedback tones fill from the active theme", async () => {
    await renderInTheme(
      "dark",
      <Badge tone="warning" text="Encumbrance" testID="badge-under-test" />,
    );
    const badge = await screen.findByTestId("badge-under-test");
    expect(badge.props.style.backgroundColor).toBe("#F1FA8C");
    expect(await labelColor("Encumbrance")).toBe("#1B1B24");
  });

  test("unfilled badges outline the fill and follow the resolved mode text", async () => {
    const light = await renderInTheme(
      "light",
      <Badge
        tone="success"
        text="Encumbrance"
        filled={false}
        testID="badge-under-test"
      />,
    );
    const lightBadge = await screen.findByTestId("badge-under-test");
    expect(lightBadge.props.style.backgroundColor).toBe("transparent");
    expect(await labelColor("Encumbrance")).toBe("#282A36");
    await light.unmount();

    await renderInTheme(
      "dark",
      <Badge
        tone="success"
        text="Encumbrance"
        filled={false}
        testID="badge-under-test"
      />,
    );
    await screen.findByTestId("badge-under-test");
    expect(await labelColor("Encumbrance")).toBe("#F8F8F2");
  });
});
