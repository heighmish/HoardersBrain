import Button from "@/components/Basic/Button";
import NumericInput from "@/components/Basic/NumericInput";
import ThemedText from "@/components/Basic/ThemedText";
import { useDatabase } from "@/db/DatabaseProvider";
import { useSelectedCharacter } from "@/stores/CharacterContext";
import { useTheme } from "@/stores/ThemeContext";
import { charactersTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { router } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";

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
        <ThemedText variant="body">Failed to load currency information</ThemedText>
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
  const theme = useTheme();
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
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.md,
        gap: theme.spacing.md,
      }}
    >
      <View style={{ display: "flex", gap: theme.spacing.md }}>
        {CURRENCY_KEYS.map((currency) => (
          <View key={`${currency}-update-view`}>
            <ThemedText
              variant="headline"
              style={{ marginBottom: theme.spacing.xs }}
              key={`${currency}-update-label`}
            >
              {currency}
            </ThemedText>
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
        <Button
          title="Update"
          onPress={saveUpdate}
          testID="update-currency-button"
          size="sm"
        />
      </View>
    </View>
  );
};

export default UpdateCurrencySheet;
