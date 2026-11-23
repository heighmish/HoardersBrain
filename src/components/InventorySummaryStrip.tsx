import ThemedText from "@/components/Basic/ThemedText";
import type { Item, Storage } from "@/db/schema";
import { useCharacter } from "@/hooks/useCharacter";
import { useTheme } from "@/stores/ThemeContext";
import { calculateTotalGoldValue } from "@/utils/currency";
import {
  determineEncumbranceTone,
  formatWeight,
  sumCarriedWeight,
} from "@/utils/encumbrance";
import { AntDesign } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, View } from "react-native";

interface InventorySummaryStripProps {
  characterId: number;
  items: readonly Item[];
  containers: readonly Storage[];
  encumbranceReady: boolean;
}

const InventorySummaryStrip: React.FC<InventorySummaryStripProps> = ({
  characterId,
  items,
  containers,
  encumbranceReady,
}) => {
  const theme = useTheme();
  const character = useCharacter(characterId);

  if (character.status === "error") {
    return (
      <View
        style={{
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radius.md,
          padding: theme.spacing.sm,
        }}
      >
        <ThemedText variant="caption" style={{ color: theme.colors.error }}>
          Failed to load character summary
        </ThemedText>
      </View>
    );
  }

  if (character.status !== "ready") {
    return null;
  }

  const goldValue = calculateTotalGoldValue(character.data);
  const showEncumbrance = character.data.weight_tracking && encumbranceReady;
  const totalCarriedWeight = showEncumbrance
    ? sumCarriedWeight(items, containers)
    : 0;
  const encumbranceColor = showEncumbrance
    ? theme.colors[
        determineEncumbranceTone(
          totalCarriedWeight,
          character.data.max_encumbrance,
        )
      ]
    : theme.colors.success;

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        boxShadow: theme.shadows.card,
        borderRadius: theme.radius.md,
        borderCurve: "continuous",
        flexDirection: "row",
        alignItems: "center",
        minHeight: 44,
        overflow: "hidden",
      }}
      testID="inventory-summary-strip"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Currency"
        testID="currency-card"
        onPress={() => router.push("/UpdateCurrencySheet")}
        style={({ pressed }) => ({
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          gap: theme.spacing.xs,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.xs,
            flexShrink: 1,
          }}
        >
          <ThemedText variant="caption">Currency</ThemedText>
          <ThemedText
            variant="subhead"
            numberOfLines={1}
            style={{
              color: theme.colors.text,
              fontWeight: "600",
              fontVariant: ["tabular-nums"],
            }}
          >
            {goldValue.toFixed(2)} gp
          </ThemedText>
        </View>
        <AntDesign name="right" size={12} color={theme.colors.textMuted} />
      </Pressable>

      {showEncumbrance ? (
        <>
          <View
            style={{
              width: 1,
              alignSelf: "stretch",
              marginVertical: theme.spacing.sm,
              backgroundColor: theme.colors.border,
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Encumbrance"
            testID="encumbrance-card"
            onPress={() => router.push("/CharacterSettings")}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: theme.spacing.xs,
              paddingHorizontal: theme.spacing.md,
              paddingVertical: theme.spacing.sm,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: theme.radius.full,
                backgroundColor: encumbranceColor,
              }}
            />
            <ThemedText
              variant="subhead"
              numberOfLines={1}
              style={{
                color: theme.colors.text,
                fontWeight: "600",
                fontVariant: ["tabular-nums"],
              }}
            >
              {formatWeight(totalCarriedWeight)}/{character.data.max_encumbrance}
            </ThemedText>
            <AntDesign name="right" size={12} color={theme.colors.textMuted} />
          </Pressable>
        </>
      ) : null}
    </View>
  );
};

export default InventorySummaryStrip;
