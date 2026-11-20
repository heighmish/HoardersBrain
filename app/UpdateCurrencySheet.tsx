import NumericInput from "@/components/Basic/NumericInput";
import { Colours, defaultStyles, Spacing } from "@/constants/Styles";
import { useDatabase } from "@/db/DatabaseProvider";
import { charactersTable } from "@/db/schema";
import { useSelectedCharacter } from "@/stores/CharacterContext";
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

const CURRENCY_KEYS = [
  "platinum",
  "gold",
  "silver",
  "copper",
] as const satisfies readonly (keyof CurrencyValues)[];

/**
 * Loads the character's currencies, then mounts the form only once the
 * data exists so the form initializes its edit state during first render
 * (no setState-in-effect sync).
 */
const UpdateCurrencySheet = () => {
  const db = useDatabase();
  const character = useSelectedCharacter();

  const characterQuery = useLiveQuery(
    db.query.charactersTable.findFirst({
      columns: { platinum: true, gold: true, silver: true, copper: true },
      where: eq(charactersTable.character_id, character.id),
    }),
    [character.id],
  );

  if (characterQuery.error) {
    return (
      <View>
        <Text>Failed to load currency information</Text>
      </View>
    );
  }

  if (!characterQuery.data) {
    return null;
  }

  return (
    <CurrencyForm initial={characterQuery.data} characterId={character.id} />
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

  const handleChange = (currency: keyof CurrencyValues, value: string) => {
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
        {CURRENCY_KEYS.map((currency) => (
          <View key={`${currency}-update-view`}>
            <Text
              style={[defaultStyles.inputLabel, { marginBottom: Spacing.xs }]}
              key={`${currency}-update-label`}
            >
              {currency}
            </Text>
            <View>
              <NumericInput
                buttonDecrement={() =>
                  handleChange(currency, (currencies[currency] - 1).toString())
                }
                buttonIncrement={() =>
                  handleChange(currency, (currencies[currency] + 1).toString())
                }
                placeholder={currency}
                onChangeText={(text) => handleChange(currency, text)}
                value={currencies[currency].toFixed(0)}
                testID={`${currency}-input`}
                key={`${currency}-update`}
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
