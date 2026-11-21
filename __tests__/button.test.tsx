import Button, { ButtonProps } from "@/components/Basic/Button";
import { THEME_SETTINGS } from "@/constants/CacheKeys";
import { readableTextColor } from "@/constants/theme";
import { ThemeProvider } from "@/stores/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { render, screen } from "@testing-library/react-native";
import { StyleProp, StyleSheet, TextStyle, ViewStyle } from "react-native";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const flatViewStyle = (style: StyleProp<ViewStyle>) => {
  const resolved = StyleSheet.flatten(style);
  if (resolved === null || resolved === undefined) {
    throw new Error("view style could not be resolved");
  }
  return resolved;
};

const flatTextStyle = (style: StyleProp<TextStyle>) => {
  const resolved = StyleSheet.flatten(style);
  if (resolved === null || resolved === undefined) {
    throw new Error("text style could not be resolved");
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

const renderButton = async (mode: "light" | "dark", props: ButtonProps) => {
  storedSettings = JSON.stringify({
    presetId: "mind-flayer",
    mode,
    customPalettes: [],
  });
  return render(
    <ThemeProvider>
      <Button testID="button-under-test" {...props} />
    </ThemeProvider>,
  );
};

const buttonViewStyle = async () => {
  const button = await screen.findByTestId("button-under-test");
  return flatViewStyle(button.props.style);
};

describe("Button", () => {
  test("primary renders the accent fill with computed readable text", async () => {
    await renderButton("dark", {
      title: "Create",
      onPress: () => {},
    });
    expect((await buttonViewStyle()).backgroundColor).toBe("#BD93F9");
    const label = await screen.findByText("Create");
    const labelStyle = flatTextStyle(label.props.style);
    expect(labelStyle.fontSize).toBe(17);
    expect(labelStyle.color).toBe(readableTextColor("#BD93F9"));
  });

  test("primary follows a resolved light mode", async () => {
    await renderButton("light", {
      title: "Create",
      onPress: () => {},
    });
    expect((await buttonViewStyle()).backgroundColor).toBe("#9529E0");
  });

  test("secondary renders the surface fill with a themed border", async () => {
    await renderButton("dark", {
      title: "Cancel",
      variant: "secondary",
      onPress: () => {},
    });
    const style = await buttonViewStyle();
    expect(style.backgroundColor).toBe("#282A36");
    expect(style.borderColor).toBe("#44475A");
    expect(style.borderWidth).toBe(1);
    const label = await screen.findByText("Cancel");
    expect(flatTextStyle(label.props.style).color).toBe("#F8F8F2");
  });

  test("sm maps to the subhead type ramp instead of a fresh font size", async () => {
    await renderButton("dark", {
      title: "Save",
      size: "sm",
      onPress: () => {},
    });
    expect((await buttonViewStyle()).height).toBe(36);
    const label = await screen.findByText("Save");
    const labelStyle = flatTextStyle(label.props.style);
    expect(labelStyle.fontSize).toBe(15);
    expect(labelStyle.fontWeight).toBe("600");
  });

  test("unpressed renders full opacity and disabled dims", async () => {
    await renderButton("dark", {
      title: "Create",
      onPress: () => {},
    });
    expect((await buttonViewStyle()).opacity).toBe(1);
  });

  test("disabled exposes its state and dims", async () => {
    await renderButton("dark", {
      title: "Create",
      disabled: true,
      onPress: () => {},
    });
    const button = await screen.findByTestId("button-under-test");
    expect(button.props.accessibilityState).toEqual({
      disabled: true,
      busy: false,
    });
    expect(flatViewStyle(button.props.style).opacity).toBe(0.4);
  });

  test("loading exposes busy state and keeps the label available", async () => {
    await renderButton("dark", {
      title: "Create",
      loading: true,
      onPress: () => {},
    });
    const button = await screen.findByTestId("button-under-test");
    expect(button.props.accessibilityState).toEqual({
      disabled: true,
      busy: true,
    });
    expect(button.props.accessibilityLabel).toBe("Create");
    expect(screen.queryByText("Create")).toBeNull();
  });

  test("fullWidth stretches instead of per-call-site patches", async () => {
    await renderButton("dark", {
      title: "Create",
      fullWidth: true,
      onPress: () => {},
    });
    expect((await buttonViewStyle()).alignSelf).toBe("stretch");
  });
});
