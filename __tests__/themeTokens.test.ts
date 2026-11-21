import {
  buildThemeColors,
  isHexColor,
  motion,
  normalizeHex,
  readableTextColor,
} from "@/constants/theme";
import { themePresets } from "@/constants/themePresets";

const channelLuminance = (channel: number): number => {
  const scaled = channel / 255;
  return scaled <= 0.03928
    ? scaled / 12.92
    : Math.pow((scaled + 0.055) / 1.055, 2.4);
};

const relativeLuminance = (hex: string): number => {
  const value = normalizeHex(hex).slice(1);
  return (
    0.2126 * channelLuminance(Number.parseInt(value.slice(0, 2), 16)) +
    0.7152 * channelLuminance(Number.parseInt(value.slice(2, 4), 16)) +
    0.0722 * channelLuminance(Number.parseInt(value.slice(4, 6), 16))
  );
};

const contrastRatio = (foreground: string, background: string): number => {
  const lighter = Math.max(
    relativeLuminance(foreground),
    relativeLuminance(background),
  );
  const darker = Math.min(
    relativeLuminance(foreground),
    relativeLuminance(background),
  );
  return (lighter + 0.05) / (darker + 0.05);
};

describe("readableTextColor", () => {
  test("deep dark fills pair with white text", () => {
    for (const hex of [
      "#21222C",
      "#282A36",
      "#1C1C1E",
      "#1565C0",
      "#9D0006",
      "#1E1E2E",
      "#8839EF",
    ]) {
      expect(readableTextColor(hex)).toBe("#FFFFFF");
    }
  });

  test("bright fills pair with dark text", () => {
    for (const hex of [
      "#F8F8F2",
      "#ECEFF4",
      "#FFFFFF",
      "#50FA7B",
      "#F1FA8C",
      "#BD93F9",
      "#CBA6F7",
      "#88C0D0",
      "#FE8019",
    ]) {
      expect(readableTextColor(hex)).toBe("#1B1B24");
    }
  });

  test("the mind flayer accent pairs dark-on-lavender, not white", () => {
    expect(readableTextColor("#BD93F9")).toBe("#1B1B24");
    expect(contrastRatio("#1B1B24", "#BD93F9")).toBeGreaterThan(7);
  });
});

describe("theme color pairing", () => {
  test("every preset variant pairs its accent with readable text", () => {
    for (const preset of themePresets) {
      for (const variant of [preset.light, preset.dark]) {
        const colors = buildThemeColors(variant);
        expect(contrastRatio(colors.accentText, variant.accent)).toBeGreaterThan(4);
      }
    }
  });
});

describe("motion tokens", () => {
  test("durations keep state feedback, element, and surface scales apart", () => {
    expect(motion.fast).toBe(150);
    expect(motion.base).toBe(250);
    expect(motion.slow).toBe(400);
    expect(motion.fast).toBeLessThan(motion.base);
    expect(motion.base).toBeLessThan(motion.slow);
  });
});

describe("hex helpers", () => {
  test("accepts 3 and 6 digit hex with or without a hash", () => {
    expect(isHexColor("#BD93F9")).toBe(true);
    expect(isHexColor("bd93f9")).toBe(true);
    expect(isHexColor("#FFF")).toBe(true);
    expect(isHexColor("fff")).toBe(true);
  });

  test("rejects non-hex values", () => {
    expect(isHexColor("#GGHHII")).toBe(false);
    expect(isHexColor("lavender")).toBe(false);
    expect(isHexColor("#BD93F9FF")).toBe(false);
    expect(isHexColor("")).toBe(false);
    expect(isHexColor("  ")).toBe(false);
  });

  test("normalizes to uppercase 6 digit hex", () => {
    expect(normalizeHex("bd93f9")).toBe("#BD93F9");
    expect(normalizeHex("#f9f")).toBe("#FF99FF");
    expect(normalizeHex(" #50fa7b ")).toBe("#50FA7B");
  });
});
