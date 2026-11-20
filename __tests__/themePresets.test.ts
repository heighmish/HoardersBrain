import { RarityArray } from "@/constants/databaseTypes";
import { rarityColors } from "@/constants/rarity";
import { isHexColor, normalizeHex } from "@/constants/theme";
import { PaletteSemantics } from "@/constants/theme";
import {
  DEFAULT_PRESET_ID,
  defaultPreset,
  themePresets,
} from "@/constants/themePresets";

const SEMANTIC_KEYS = [
  "background",
  "surface",
  "text",
  "textMuted",
  "accent",
  "accentSecondary",
  "border",
  "success",
  "warning",
  "error",
] as const satisfies readonly (keyof PaletteSemantics)[];

const expectValidVariant = (variant: PaletteSemantics) => {
  for (const key of SEMANTIC_KEYS) {
    const value = variant[key];
    expect(isHexColor(value)).toBe(true);
    expect(normalizeHex(value)).toBe(value);
  }
};

describe("theme presets", () => {
  test("every preset id is unique", () => {
    const ids = themePresets.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("every preset ships well-formed light and dark variants", () => {
    expect(themePresets.length).toBeGreaterThan(0);
    for (const preset of themePresets) {
      expectValidVariant(preset.light);
      expectValidVariant(preset.dark);
    }
  });

  test("the default preset is Mind Flayer and is part of the list", () => {
    expect(DEFAULT_PRESET_ID).toBe("mind-flayer");
    expect(defaultPreset.name).toBe("Mind Flayer");
    expect(themePresets).toContain(defaultPreset);
  });

  test("Mind Flayer carries the brand accents in both variants", () => {
    expect(defaultPreset.dark.accent).toBe("#BD93F9");
    expect(defaultPreset.dark.accentSecondary).toBe("#FF79C6");
    expect(defaultPreset.light.accentSecondary).not.toBe(
      defaultPreset.dark.accentSecondary,
    );
    expect(defaultPreset.light).not.toEqual(defaultPreset.dark);
  });

  test("light and dark variants of a preset never share a background", () => {
    for (const preset of themePresets) {
      expect(preset.light.background).not.toBe(preset.dark.background);
    }
  });
});

describe("rarity palette", () => {
  test("every rarity has a mode-independent color", () => {
    for (const rarity of RarityArray) {
      const value = rarityColors[rarity];
      expect(isHexColor(value)).toBe(true);
      expect(normalizeHex(value)).toBe(value);
    }
  });

  test("covers exactly the rarity union", () => {
    expect(Object.keys(rarityColors).sort()).toEqual([...RarityArray].sort());
  });
});
