import {
  PaletteSemantics,
  ThemeMode,
} from "@/constants/theme";
import { themePresets } from "@/constants/themePresets";
import { useTheme } from "@/stores/ThemeContext";
import { Pressable, ScrollView, Text, View } from "react-native";

const THEME_MODE_OPTIONS: readonly { value: ThemeMode; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const SWATCH_KEYS: readonly (keyof PaletteSemantics)[] = [
  "accent",
  "accentSecondary",
  "success",
  "warning",
  "error",
];

const modeLabel = (mode: ThemeMode): string =>
  mode === "system" ? "System" : mode === "light" ? "Light" : "Dark";

const SwatchStrip = ({ palette }: { palette: PaletteSemantics }) => {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: theme.spacing.xs }}>
      {SWATCH_KEYS.map((key) => (
        <View
          key={key}
          style={{
            width: 14,
            height: 14,
            borderRadius: theme.radius.full,
            backgroundColor: palette[key],
          }}
        />
      ))}
    </View>
  );
};

const ThemeSettingsSheet = () => {
  const theme = useTheme();
  const { presetId, presetName, mode, selectPreset, setMode } = useTheme();

  const sectionLabel = (text: string) => (
    <Text
      style={[
        theme.type.caption,
        { textTransform: "uppercase", letterSpacing: 0.5 },
      ]}
    >
      {text}
    </Text>
  );

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.surface }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        padding: theme.spacing.md,
        paddingTop: theme.spacing.xl,
        gap: theme.spacing.md,
      }}
    >
      <View style={{ gap: theme.spacing.xs }}>
        <Text style={theme.type.title}>Theme</Text>
        <Text style={theme.type.subhead} testID="theme-state-line">
          {presetName} · {modeLabel(mode)}
        </Text>
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        {sectionLabel("Mode")}
        <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
          {THEME_MODE_OPTIONS.map(({ value, label }) => {
            const selected = mode === value;
            return (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                testID={`theme-mode-${value}`}
                onPress={() => setMode(value)}
                style={{
                  backgroundColor: selected
                    ? theme.colors.accent
                    : "transparent",
                  borderColor: selected
                    ? theme.colors.accent
                    : theme.colors.border,
                  borderWidth: 1,
                  borderRadius: theme.radius.full,
                  paddingVertical: theme.spacing.xs,
                  paddingHorizontal: theme.spacing.md,
                }}
              >
                <Text
                  style={{
                    color: selected
                      ? theme.colors.accentText
                      : theme.colors.text,
                    fontSize: theme.type.subhead.fontSize,
                    fontWeight: "600",
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        {sectionLabel("Presets")}
        {themePresets.map((preset) => {
          const selected = presetId === preset.id;
          return (
            <Pressable
              key={preset.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              testID={`theme-preset-${preset.id}`}
              onPress={() => selectPreset(preset.id)}
              style={({ pressed }) => ({
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: theme.spacing.sm,
                paddingVertical: theme.spacing.xs,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Text style={theme.type.body}>{preset.name}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
                <SwatchStrip palette={preset[theme.resolvedMode]} />
                {selected && (
                  <Text
                    style={[theme.type.caption, { color: theme.colors.accent }]}
                  >
                    Selected
                  </Text>
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
};

export default ThemeSettingsSheet;
