import ThemedText from "@/components/Basic/ThemedText";
import type { Item, Storage } from "@/db/schema";
import { useCharacter } from "@/hooks/useCharacter";
import { useLayout } from "@/hooks/useLayout";
import { useTheme } from "@/stores/ThemeContext";
import {
  calculateTotalGoldValue,
  formatCompactPurse,
  formatPurseSummary,
} from "@/utils/currency";
import {
  calculateEncumbranceFillRatio,
  calculateEncumbrancePercent,
  determineEncumbranceTone,
  formatWeight,
  sumCarriedWeight,
} from "@/utils/encumbrance";
import { AntDesign } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, View } from "react-native";

const TILE_PADDING = 12; // Compact tile inset between sm (8) and md (16)
const RING_SIZE = 38; // Radial load gauge diameter sized to fit beside 2-line metrics
const RING_HALF = RING_SIZE / 2;

interface TileHeaderProps {
  label: string;
}

const TileHeader: React.FC<TileHeaderProps> = ({ label }) => {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: theme.spacing.xs,
      }}
    >
      <ThemedText
        variant="caption"
        numberOfLines={1}
        style={{
          textTransform: "uppercase",
          letterSpacing: 0.5,
          fontWeight: "600",
          flexShrink: 1,
        }}
      >
        {label}
      </ThemedText>
      <AntDesign
        name="right"
        size={theme.layout.icon.xs}
        color={theme.colors.textMuted}
      />
    </View>
  );
};

interface EncumbranceRingProps {
  ratio: number;
  color: string;
  trackColor: string;
  strokeWidth: number;
  radiusFull: number;
}

const EncumbranceRing: React.FC<EncumbranceRingProps> = ({
  ratio,
  color,
  trackColor,
  strokeWidth,
  radiusFull,
}) => {
  const rightDeg = Math.min(ratio, 0.5) * 360;
  const leftDeg = Math.max(0, ratio - 0.5) * 360;

  if (ratio >= 1) {
    return (
      <View
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{
          width: RING_SIZE,
          height: RING_SIZE,
          borderRadius: radiusFull,
          borderWidth: strokeWidth,
          borderColor: color,
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <View
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: RING_SIZE,
        height: RING_SIZE,
        position: "relative",
        flexShrink: 0,
      }}
    >
      <View
        style={{
          width: RING_SIZE,
          height: RING_SIZE,
          borderRadius: radiusFull,
          borderWidth: strokeWidth,
          borderColor: trackColor,
        }}
      />

      {ratio > 0 ? (
        <View
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: RING_HALF,
            height: RING_SIZE,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: RING_SIZE,
              height: RING_SIZE,
              borderRadius: radiusFull,
              borderWidth: strokeWidth,
              borderColor: "transparent",
              borderTopColor: color,
              borderRightColor: color,
              transform: [{ rotate: `${-135 + rightDeg}deg` }],
            }}
          />
        </View>
      ) : null}

      {ratio > 0.5 ? (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: RING_HALF,
            height: RING_SIZE,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: RING_SIZE,
              height: RING_SIZE,
              borderRadius: radiusFull,
              borderWidth: strokeWidth,
              borderColor: "transparent",
              borderBottomColor: color,
              borderLeftColor: color,
              transform: [{ rotate: `${-135 + leftDeg}deg` }],
            }}
          />
        </View>
      ) : null}
    </View>
  );
};

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
  const { isCompactWidth, isLargeText, fontScale } = useLayout();
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

  const stackTiles = isLargeText || (isCompactWidth && fontScale > 1.1);
  const goldValue = calculateTotalGoldValue(character.data);
  const compactPurse = formatCompactPurse(character.data);
  const currencyAccessibilityLabel = `Currency, ${goldValue.toFixed(2)} gp, ${formatPurseSummary(character.data)}`;

  const showEncumbrance = character.data.weight_tracking && encumbranceReady;
  const encumbrance = showEncumbrance
    ? (() => {
        const carried = sumCarriedWeight(items, containers);
        const max = character.data.max_encumbrance;
        const percent = calculateEncumbrancePercent(carried, max);
        return {
          carriedFormatted: formatWeight(carried),
          max,
          percent,
          ratio: calculateEncumbranceFillRatio(carried, max),
          color: theme.colors[determineEncumbranceTone(carried, max)],
        };
      })()
    : null;

  const tileBaseStyle = {
    flex: stackTiles ? undefined : 1,
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: theme.layout.hairline,
    boxShadow: theme.shadows.card,
    borderRadius: theme.radius.lg,
    borderCurve: "continuous" as const,
    padding: TILE_PADDING,
    minHeight: theme.layout.touchMin,
    justifyContent: "space-between" as const,
    gap: theme.spacing.xs,
  };

  return (
    <View
      style={{
        flexDirection: stackTiles ? "column" : "row",
        alignItems: "stretch",
        gap: theme.spacing.sm,
      }}
      testID="inventory-summary-strip"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={currencyAccessibilityLabel}
        testID="currency-card"
        onPress={() => router.push("/UpdateCurrencySheet")}
        style={({ pressed }) => ({
          ...tileBaseStyle,
          opacity: pressed ? theme.opacity.pressed : 1,
        })}
      >
        <TileHeader label="Currency" />

        <View style={{ gap: theme.spacing.xs }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "baseline",
              gap: theme.spacing.xs,
              flexWrap: stackTiles ? "wrap" : "nowrap",
            }}
          >
            <ThemedText
              variant="headline"
              numberOfLines={1}
              adjustsFontSizeToFit={!stackTiles}
              minimumFontScale={0.75}
              style={{
                fontVariant: ["tabular-nums"],
                flexShrink: 1,
              }}
            >
              {goldValue.toFixed(2)}
            </ThemedText>
            <ThemedText variant="caption" numberOfLines={1}>
              gp
            </ThemedText>
          </View>
          <ThemedText
            variant="caption"
            numberOfLines={stackTiles ? 2 : 1}
            style={{
              fontVariant: ["tabular-nums"],
            }}
          >
            {compactPurse}
          </ThemedText>
        </View>
      </Pressable>

      {encumbrance !== null ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Encumbrance, ${encumbrance.carriedFormatted} of ${encumbrance.max}, ${encumbrance.percent}% load`}
          testID="encumbrance-card"
          onPress={() => router.push("/CharacterSettings")}
          style={({ pressed }) => ({
            ...tileBaseStyle,
            opacity: pressed ? theme.opacity.pressed : 1,
          })}
        >
          <TileHeader label="Encumbrance" />

          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: theme.spacing.sm,
            }}
          >
            <View style={{ flex: 1, minWidth: 0, gap: theme.spacing.xs }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "baseline",
                  flexWrap: stackTiles ? "wrap" : "nowrap",
                }}
              >
                <ThemedText
                  variant="headline"
                  numberOfLines={1}
                  adjustsFontSizeToFit={!stackTiles}
                  minimumFontScale={0.75}
                  style={{
                    fontVariant: ["tabular-nums"],
                    flexShrink: 1,
                  }}
                >
                  {encumbrance.carriedFormatted}
                </ThemedText>
                <ThemedText
                  variant="caption"
                  numberOfLines={1}
                  style={{
                    fontVariant: ["tabular-nums"],
                    flexShrink: 1,
                  }}
                >
                  /{encumbrance.max}
                </ThemedText>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: theme.spacing.xs,
                }}
              >
                <View
                  accessible={false}
                  style={{
                    width: 6, // Compact status dot beside load percentage
                    height: 6,
                    borderRadius: theme.radius.full,
                    backgroundColor: encumbrance.color,
                  }}
                />
                <ThemedText
                  variant="caption"
                  numberOfLines={1}
                  style={{
                    fontVariant: ["tabular-nums"],
                    flexShrink: 1,
                  }}
                >
                  {encumbrance.percent}% load
                </ThemedText>
              </View>
            </View>

            <EncumbranceRing
              ratio={encumbrance.ratio}
              color={encumbrance.color}
              trackColor={theme.colors.border}
              strokeWidth={theme.spacing.xs}
              radiusFull={theme.radius.full}
            />
          </View>
        </Pressable>
      ) : null}
    </View>
  );
};

export default InventorySummaryStrip;
