import NumericInput from "@/components/Basic/NumericInput";
import { Colours, defaultStyles, Spacing } from "@/constants/Styles";
import { useDatabase } from "@/db/DatabaseProvider";
import { charactersTable } from "@/db/schema";
import { useCharacterContext } from "@/stores/CharacterContext";
import { AntDesign } from "@expo/vector-icons";
import { eq } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { router } from "expo-router";
import React, { useState } from "react";
import { Pressable, Text, View } from "react-native";

type CurrencyValues = {
  platinum: number;
  gold: number;
  silver: number;
  copper: number;
};

/**
 * Loads the character's currencies, then mounts the form only once the
 * data exists so the form initializes its edit state during first render
 * (no setState-in-effect sync).
 */
const UpdateCurrencySheet = () => {
  const db = useDatabase();
  const character = useCharacterContext();

  const characterQuery = useLiveQuery(
    db.query.charactersTable.findFirst({
      columns: { platinum: true, gold: true, silver: true, copper: true },
      where: eq(charactersTable.character_id, character.character.id),
    }),
    [character.character.id],
  );

  if (!characterQuery.data || characterQuery.error) {
    return (
      <View>
        <Text>Failed to load currency information</Text>
      </View>
    );
  }

  return (
    <CurrencyForm
      initial={characterQuery.data}
      characterId={character.character.id}
    />
  );
};

interface CurrencyFormProps {
  initial: CurrencyValues;
  characterId: number;
}

const CurrencyForm: React.FC<CurrencyFormProps> = ({ initial, characterId }) => {
  const db = useDatabase();
  const [currencies, setCurrencies] = useState<CurrencyValues>({
    platinum: initial.platinum,
    gold: initial.gold,
    silver: initial.silver,
    copper: initial.copper,
  });

  const handleChange = (currency: string, value: string) => {
    const newValue = value === "" ? 0 : Math.max(0, parseInt(value) || 0);
    setCurrencies((prev) => ({
      ...prev,
      [currency]: newValue,
    }));
  };

  const saveUpdate = async () => {
    await db
      .update(charactersTable)
      .set({
        copper: currencies.copper,
        silver: currencies.silver,
        gold: currencies.gold,
        platinum: currencies.platinum,
      })
      .where(eq(charactersTable.character_id, characterId));

    router.back();
  };

  return (
    <View style={[defaultStyles.container, { gap: Spacing.m }]}>
      <View style={{ display: "flex", gap: Spacing.m }}>
        {Object.entries(currencies).map((currency) => (
          <View key={`${currency[0]}-update-view`}>
            <Text
              style={[defaultStyles.inputLabel, { marginBottom: Spacing.xs }]}
              key={`${currency[0]}-update-label`}
            >
              {currency[0]}
            </Text>
            <View>
              <NumericInput
                buttonDecrement={() =>
                  handleChange(currency[0], (currency[1] - 1).toString())
                }
                buttonIncrement={() =>
                  handleChange(currency[0], (currency[1] + 1).toString())
                }
                placeholder={currency[0]}
                onChangeText={(text) => handleChange(currency[0], text)}
                value={currency[1].toFixed(0) || ""}
                testID={`${currency[0]}-input`}
                key={`${currency[0]}-update`}
              />
            </View>
          </View>
        ))}
      </View>
      <View
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "flex-end",
        }}
      >
        <Pressable
          accessibilityRole="button"
          testID="update-currency-button"
          onPress={saveUpdate}
          style={({ pressed }) => [
            defaultStyles.pillButtonSmall,
            {
              backgroundColor: Colours.primary,
              width: "30%",
              display: "flex",
              flexDirection: "row",
              gap: Spacing.xs,
            },
            pressed && { opacity: 0.6 },
          ]}
        >
          <Text>Update</Text>
          <AntDesign name="arrow-right" size={12} color="black" />
        </Pressable>
      </View>
    </View>
  );
};

export default UpdateCurrencySheet;
