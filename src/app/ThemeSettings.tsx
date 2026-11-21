import { AntDesign } from "@expo/vector-icons";
import AppHeader from "@/components/Basic/AppHeader";
import {
  PaletteSemantics,
  ThemeMode,
} from "@/constants/theme";
import { themePresets } from "@/constants/themePresets";
import ThemedText from "@/components/Basic/ThemedText";
import { useTheme } from "@/stores/ThemeContext";
import { Pressable, ScrollView, View } from "react-native";

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

const ThemeSettings = () => {
  const theme = useTheme();
  const { presetId, presetName, mode, selectPreset, setMode } = useTheme();

  const sectionLabel = (text: string) => (
    <ThemedText
      variant="caption"
      style={{ textTransform: "uppercase", letterSpacing: 0.5 }}
    >
      {text}
    </ThemedText>
  );

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AppHeader title="Theme" />
      <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        padding: theme.spacing.md,
        gap: theme.spacing.md,
      }}
    >
      <View style={{ gap: theme.spacing.xs }}>
        <ThemedText variant="subhead" testID="theme-state-line">
          {presetName} · {modeLabel(mode)}
        </ThemedText>
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
                <ThemedText
                  variant="subhead"
                  style={{
                    color: selected
                      ? theme.colors.accentText
                      : theme.colors.text,
                    fontWeight: "600",
                  }}
                >
                  {label}
                </ThemedText>
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
              <ThemedText variant="body">{preset.name}</ThemedText>
              <View style={{ flexDirection: "row", alignItems: "center", gap: theme.spacing.sm }}>
                <SwatchStrip palette={preset[theme.resolvedMode]} />
                {selected && (
                  <AntDesign name="check" size={16} color={theme.colors.accent} />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
    </View>
  );
};

export default ThemeSettings;
