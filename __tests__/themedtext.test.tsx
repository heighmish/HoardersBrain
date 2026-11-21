import ThemedText from "@/components/Basic/ThemedText";
import { THEME_SETTINGS } from "@/constants/CacheKeys";
import { ThemeProvider } from "@/stores/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { render, screen } from "@testing-library/react-native";
import { ReactNode } from "react";
import { StyleProp, StyleSheet, TextStyle } from "react-native";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const flatStyle = (style: StyleProp<TextStyle>) => {
  const resolved = StyleSheet.flatten(style);
  if (resolved === null || resolved === undefined) {
    throw new Error("style could not be resolved");
  }
  return resolved;
};

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

describe("ThemedText", () => {
  test("variants resolve the type ramp in dark mode", async () => {
    await renderInTheme(
      "dark",
      <ThemedText variant="title" testID="title-text">
        Title
      </ThemedText>,
    );
    const style = flatStyle(
      (await screen.findByTestId("title-text")).props.style,
    );
    expect(style.fontSize).toBe(22);
    expect(style.color).toBe("#F8F8F2");
    expect(style.fontWeight).toBe("600");
  });

  test("follows a resolved light mode for ramp colors", async () => {
    await renderInTheme(
      "light",
      <ThemedText variant="body" testID="body-text">
        Body
      </ThemedText>,
    );
    expect(
      flatStyle((await screen.findByTestId("body-text")).props.style).color,
    ).toBe("#282A36");
  });

  test("defaults to body and merges caller style last", async () => {
    await renderInTheme(
      "dark",
      <ThemedText testID="plain-text" style={{ color: "#C32293" }}>
        Plain
      </ThemedText>,
    );
    const style = flatStyle(
      (await screen.findByTestId("plain-text")).props.style,
    );
    expect(style.fontSize).toBe(17);
    expect(style.color).toBe("#C32293");
  });
});
