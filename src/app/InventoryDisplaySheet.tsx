import ThemedText from "@/components/Basic/ThemedText";
import {
  InventoryDisplayPrefs,
  useInventoryDisplay,
} from "@/stores/InventoryDisplayContext";
import { useTheme } from "@/stores/ThemeContext";
import React from "react";
import { Pressable, Switch, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const InventoryDisplaySheet = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { prefs, togglePref, setPref } = useInventoryDisplay();

  const sectionLabel = (label: string) => (
    <ThemedText
      variant="caption"
      style={{ textTransform: "uppercase", letterSpacing: 0.5 }}
    >
      {label}
    </ThemedText>
  );

  const divider = (
    <View style={{ height: 1, backgroundColor: theme.colors.border }} />
  );

  const toggleRow = (
    key: keyof InventoryDisplayPrefs,
    label: string,
    subtitle?: string,
  ) => (
    <Pressable
      onPress={() => togglePref(key)}
      accessibilityRole="switch"
      accessibilityState={{ checked: prefs[key] }}
      style={({ pressed }) => ({
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        gap: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        minHeight: 44,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      <View style={{ flex: 1, gap: theme.spacing.xs }}>
        <ThemedText variant="body">{label}</ThemedText>
        {subtitle !== undefined ? (
          <ThemedText variant="caption">{subtitle}</ThemedText>
        ) : null}
      </View>
      <Switch
        value={prefs[key]}
        onValueChange={(value) => setPref(key, value)}
        trackColor={{
          false: theme.colors.border,
          true: theme.colors.accent,
        }}
        testID={`display-toggle-${key}`}
      />
    </Pressable>
  );

  const cardStyle = {
    backgroundColor: theme.colors.background,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    borderCurve: "continuous" as const,
    overflow: "hidden" as const,
  };

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.md,
        paddingBottom: insets.bottom + theme.spacing.lg,
        gap: theme.spacing.md,
      }}
      testID="inventory-display-sheet"
    >
      <ThemedText variant="headline">Inventory display</ThemedText>

      <View style={{ gap: theme.spacing.xs }}>
        {sectionLabel("Columns")}
        <View style={cardStyle}>
          {toggleRow("showQuantity", "Quantity")}
          {divider}
          {toggleRow("showWeight", "Weight")}
          {divider}
          {toggleRow("showValue", "Value")}
        </View>
      </View>

      <View style={{ gap: theme.spacing.xs }}>
        {sectionLabel("Row details")}
        <View style={cardStyle}>
          {toggleRow("showTags", "Tags")}
          {divider}
          {toggleRow("showRarity", "Rarity indicator")}
          {divider}
          {toggleRow(
            "showQuickUse",
            "Quick use (-1)",
            "Show -1 button on usable items",
          )}
        </View>
      </View>
    </View>
  );
};

export default InventoryDisplaySheet;
