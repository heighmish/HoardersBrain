import ThemedText from "@/components/Basic/ThemedText";
import { useTheme } from "@/stores/ThemeContext";
import { AntDesign } from "@expo/vector-icons";
import { Link } from "expo-router";
import React from "react";
import { Pressable, View } from "react-native";
import { useCharacterRow } from "@/hooks/useCharacterRow";
import { calculateTotalGoldValue } from "@/utils/currency";

interface CurrencyProps {
  characterId: number;
}

const Currency: React.FC<CurrencyProps> = ({ characterId }) => {
  const theme = useTheme();
  const character = useCharacterRow(characterId);

  if (character.error) {
    return (
      <View>
        <ThemedText variant="body">
          Failed to load character information
        </ThemedText>
      </View>
    );
  }

  if (!character.data) {
    return null;
  }

  const goldValue = calculateTotalGoldValue(character.data);

  return (
    <Link href="/UpdateCurrencySheet" asChild>
      <Pressable
        testID="currency-card"
        style={{ paddingLeft: theme.spacing.sm }}
      >
        {({ pressed }) => (
          <View
            style={{
              backgroundColor: theme.colors.surface,
              boxShadow: theme.shadows.card,
              borderRadius: theme.radius.lg,
              borderCurve: "continuous",
              padding: theme.spacing.sm,
              flexDirection: "row",
              gap: theme.spacing.xs,
              alignItems: "center",
              opacity: pressed ? 0.8 : 1,
            }}
          >
            <View>
              <ThemedText variant="caption">Currency</ThemedText>
              <ThemedText
                variant="subhead"
                style={{ fontVariant: ["tabular-nums"] }}
              >
                {goldValue.toFixed(2)}g
              </ThemedText>
            </View>
            <AntDesign name="right" color={theme.colors.textMuted} />
          </View>
        )}
      </Pressable>
    </Link>
  );
};

export default Currency;
