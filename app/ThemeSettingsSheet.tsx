import Button from "@/components/Basic/Button";
import {
  PaletteSemantics,
  ThemeMode,
  isHexColor,
  normalizeHex,
} from "@/constants/theme";
import {
  CustomPalette,
  customPalettePresetId,
  themePresets,
} from "@/constants/themePresets";
import { useTheme } from "@/stores/ThemeContext";
import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

const THEME_MODE_OPTIONS: readonly { value: ThemeMode; label: string }[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const PALETTE_FIELDS: readonly {
  key: keyof PaletteSemantics;
  label: string;
}[] = [
  { key: "background", label: "Background" },
  { key: "surface", label: "Surface" },
  { key: "text", label: "Text" },
  { key: "textMuted", label: "Muted text" },
  { key: "border", label: "Border" },
  { key: "accent", label: "Accent" },
  { key: "accentSecondary", label: "Secondary" },
  { key: "success", label: "Success" },
  { key: "warning", label: "Warning" },
  { key: "error", label: "Error" },
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

const PaletteEditor = ({
  initial,
  onSave,
  onCancel,
}: {
  initial: CustomPalette;
  onSave: (palette: CustomPalette) => void;
  onCancel: () => void;
}) => {
  const theme = useTheme();
  const [draft, setDraft] = useState<CustomPalette>(initial);

  const allHexesValid = PALETTE_FIELDS.every(({ key }) =>
    isHexColor(draft[key]),
  );
  const canSave =
    draft.name.trim().length > 0 && allHexesValid;

  return (
    <View
      style={{
        gap: theme.spacing.sm,
        padding: theme.spacing.md,
        backgroundColor: theme.colors.background,
        borderRadius: theme.radius.lg,
        borderCurve: "continuous",
      }}
    >
      <TextInput
        style={{
          backgroundColor: theme.colors.surface,
          color: theme.colors.text,
          borderColor: theme.colors.border,
          borderWidth: 1,
          borderRadius: theme.radius.md,
          borderCurve: "continuous",
          paddingVertical: theme.spacing.sm,
          paddingHorizontal: theme.spacing.md,
          fontSize: 17,
          fontWeight: "600",
        }}
        placeholderTextColor={theme.colors.textMuted}
        placeholder="Palette name"
        value={draft.name}
        testID="custom-palette-name-input"
        onChangeText={(text) =>
          setDraft((prev) => ({ ...prev, name: text }))
        }
      />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.sm }}>
        {PALETTE_FIELDS.map(({ key, label }) => (
          <View key={key} style={{ width: "47%", flexGrow: 1 }}>
            <Text style={theme.type.caption}>{label}</Text>
            <TextInput
              style={{
                backgroundColor: theme.colors.surface,
                color: isHexColor(draft[key]) ? theme.colors.text : theme.colors.error,
                borderColor: isHexColor(draft[key]) ? theme.colors.border : theme.colors.error,
                borderWidth: 1,
                borderRadius: theme.radius.md,
                borderCurve: "continuous",
                paddingVertical: theme.spacing.sm,
                paddingHorizontal: theme.spacing.sm,
                fontSize: 15,
              }}
              autoCapitalize="characters"
              autoCorrect={false}
              value={draft[key]}
              testID={`custom-palette-${key}-input`}
              onChangeText={(text) =>
                setDraft((prev) => ({ ...prev, [key]: text }))
              }
            />
          </View>
        ))}
      </View>
      {allHexesValid && <SwatchStrip palette={draft} />}
      <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
        <Button
          title="Cancel"
          variant="secondary"
          onPress={onCancel}
          testID="cancel-custom-palette"
        />
        <Button
          title="Save"
          onPress={() =>
            onSave({
              ...draft,
              name: draft.name.trim(),
              ...Object.fromEntries(
                PALETTE_FIELDS.map(
                  ({ key }): [string, string] => [
                    key,
                    normalizeHex(draft[key]),
                  ],
                ),
              ),
            })
          }
          disabled={!canSave}
          testID="save-custom-palette"
        />
      </View>
    </View>
  );
};

const ThemeSettingsSheet = () => {
  const theme = useTheme();
  const {
    presetId,
    presetName,
    mode,
    customPalettes,
    selectPreset,
    setMode,
    upsertCustomPalette,
    colors,
  } = useTheme();
  const [editing, setEditing] = useState<CustomPalette | null>(null);

  const startNewPalette = () => {
    setEditing({
      id: Date.now().toString(36),
      name: "",
      background: colors.background,
      surface: colors.surface,
      text: colors.text,
      textMuted: colors.textMuted,
      accent: colors.accent,
      accentSecondary: colors.accentSecondary,
      border: colors.border,
      success: colors.success,
      warning: colors.warning,
      error: colors.error,
    });
  };

  const savePalette = (palette: CustomPalette) => {
    upsertCustomPalette(palette);
    selectPreset(customPalettePresetId(palette.id));
    setEditing(null);
  };

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
        <Text
          style={[
            theme.type.caption,
            { color: theme.colors.accentSecondary },
          ]}
        >
          Dress the chest. Suit the mind.
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

      <View style={{ gap: theme.spacing.sm }}>
        {sectionLabel("Custom palettes")}
        {customPalettes.map((palette) => {
          const selected =
            presetId === customPalettePresetId(palette.id);
          return (
            <View
              key={palette.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: theme.spacing.sm,
                paddingVertical: theme.spacing.xs,
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected }}
                testID={`theme-custom-${palette.id}`}
                onPress={() => selectPreset(customPalettePresetId(palette.id))}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: theme.spacing.sm,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Text style={theme.type.body}>{palette.name}</Text>
                <SwatchStrip palette={palette} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Edit ${palette.name}`}
                testID={`theme-custom-edit-${palette.id}`}
                onPress={() => setEditing(palette)}
                style={{ padding: theme.spacing.xs }}
              >
                <Text style={[theme.type.caption, { color: theme.colors.accent }]}>
                  Edit
                </Text>
              </Pressable>
            </View>
          );
        })}
        <Button
          title="New palette"
          variant="secondary"
          size="sm"
          onPress={startNewPalette}
          testID="new-custom-palette"
        />
      </View>

      {editing !== null && (
        <PaletteEditor
          initial={editing}
          onSave={savePalette}
          onCancel={() => setEditing(null)}
        />
      )}
    </ScrollView>
  );
};

export default ThemeSettingsSheet;
