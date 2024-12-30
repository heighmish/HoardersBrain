import { useDatabase } from "@/db/DatabaseProvider";
import { charactersTable } from "@/db/schema";
import { useCharacterContext } from "@/stores/CharacterContext";
import { eq } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { useState } from "react";
import { Text, TextInput, View } from "react-native";

const UpdateCurrencySheet = () => {
  const db = useDatabase();
  const character = useCharacterContext();

  const characterQuery = useLiveQuery(
    db.query.charactersTable.findFirst({
      where: eq(charactersTable.character_id, character.character.id),
    }),
    [character.character.id],
  );

  const [currencies, setCurrencies] = useState({
    platinum: characterQuery.data?.platinum ?? 0,
    gold: characterQuery.data?.gold ?? 0,
    silver: characterQuery.data?.silver ?? 0,
    copper: characterQuery.data?.copper ?? 0,
  });

  const handleChange = (currency: string, value: string) => {
    const newValue = value === "" ? 0 : Math.max(0, parseInt(value) || 0);
    setCurrencies((prev) => ({
      ...prev,
      [currency]: newValue,
    }));
  };

  if (!characterQuery.data || characterQuery.error) {
    return (
      <View>
        <Text>Failed to load currency information</Text>
      </View>
    );
  }

  return (
    <View>
      <Text>Ahhh</Text>
      {Object.entries(currencies).map((currency) => (
        <TextInput
          keyboardType="numeric"
          placeholder={currency[0]}
          onChangeText={(text) => handleChange(currency[0], text)}
          value={currency[1].toFixed(0) || ""}
          maxLength={10}
          key={`${currency[0]}-update`}
        />
      ))}
    </View>
  );
};

export default UpdateCurrencySheet;
