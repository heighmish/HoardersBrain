import Input from "@/components/Basic/Input";
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

const inputStyle = async () => {
  const input = await screen.findByTestId("input-under-test");
  return flatStyle(input.props.style);
};

describe("Input", () => {
  test("applies themed defaults in dark mode", async () => {
    await renderInTheme(
      "dark",
      <Input placeholder="Name" testID="input-under-test" />,
    );
    const style = await inputStyle();
    expect(style.backgroundColor).toBe("#282A36");
    expect(style.borderColor).toBe("#44475A");
    expect(style.borderRadius).toBe(12);
    expect(style.fontSize).toBe(17);
    const input = await screen.findByTestId("input-under-test");
    expect(input.props.placeholderTextColor).toBe("#6272A4");
  });

  test("follows a resolved light mode", async () => {
    await renderInTheme(
      "light",
      <Input placeholder="Name" testID="input-under-test" />,
    );
    const style = await inputStyle();
    expect(style.backgroundColor).toBe("#FFFFFF");
    expect(style.borderColor).toBe("#E4E2F3");
  });

  test("caller style merges last for layout tweaks", async () => {
    await renderInTheme(
      "dark",
      <Input
        placeholder="Name"
        testID="input-under-test"
        style={{ alignSelf: "stretch" }}
      />,
    );
    const style = await inputStyle();
    expect(style.alignSelf).toBe("stretch");
    expect(style.backgroundColor).toBe("#282A36");
  });
});
