import { Spacing } from "@/constants/Styles";
import { useDatabase } from "@/db/DatabaseProvider";
import { charactersTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { Link } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

interface CurrencyProps {
  characterId: number;
}

const Currency: React.FC<CurrencyProps> = ({ characterId }) => {
  const db = useDatabase();
  const character = useLiveQuery(
    db.query.charactersTable.findFirst({
      where: eq(charactersTable.character_id, characterId),
      columns: { copper: true, silver: true, gold: true, platinum: true },
    }),
    [characterId],
  );

  if (!character.data || character.error) {
    return (
      <View>
        <Text>Failed to load character information</Text>
      </View>
    );
  }

  const GoldValue =
    character.data.platinum * 10 +
    character.data.gold +
    character.data.silver / 10 +
    character.data.copper / 100;

  return (
    <Link href="/updateCurrencySheet" style={{ paddingLeft: Spacing.s }}>
      <View>
        <Text>Currency</Text>
        <Text>{GoldValue.toFixed(2)}</Text>
      </View>
    </Link>
  );
};

export default Currency;
