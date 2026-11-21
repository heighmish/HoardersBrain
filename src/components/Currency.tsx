import { useTheme } from "@/stores/ThemeContext";
import { useDatabase } from "@/db/DatabaseProvider";
import { charactersTable } from "@/db/schema";
import { AntDesign } from "@expo/vector-icons";
import { eq } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { Link } from "expo-router";
import React from "react";
import { Pressable, Text, View } from "react-native";

interface CurrencyProps {
  characterId: number;
}

const Currency: React.FC<CurrencyProps> = ({ characterId }) => {
  const theme = useTheme();
  const db = useDatabase();
  const character = useLiveQuery(
    db.query.charactersTable.findFirst({
      where: eq(charactersTable.character_id, characterId),
      columns: { copper: true, silver: true, gold: true, platinum: true },
    }),
    [characterId],
  );

  if (character.error) {
    return (
      <View>
        <Text style={theme.type.body}>Failed to load character information</Text>
      </View>
    );
  }

  if (!character.data) {
    return null;
  }

  const GoldValue =
    character.data.platinum * 10 +
    character.data.gold +
    character.data.silver / 10 +
    character.data.copper / 100;

  return (
    <Link href="/UpdateCurrencySheet" asChild>
      <Pressable testID="currency-card" style={{ paddingLeft: theme.spacing.sm }}>
        {({ pressed }) => (
          <View
            style={[
              {
                backgroundColor: theme.colors.surface,
                boxShadow: theme.shadows.card,
                borderRadius: theme.radius.lg,
                borderCurve: "continuous",
                padding: theme.spacing.sm,
                flexDirection: "row",
                gap: theme.spacing.xs,
                alignItems: "center",
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <View>
              <Text style={theme.type.caption}>Currency</Text>
              <Text
                style={[theme.type.subhead, { fontVariant: ["tabular-nums"] }]}
              >
                {GoldValue.toFixed(2)}g
              </Text>
            </View>
            <AntDesign name="right" color={theme.colors.textMuted} />
          </View>
        )}
      </Pressable>
    </Link>
  );
};

export default Currency;
