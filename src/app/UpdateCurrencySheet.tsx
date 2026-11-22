import Button from "@/components/Basic/Button";
import NumericInput from "@/components/Basic/NumericInput";
import ThemedText from "@/components/Basic/ThemedText";
import { useDatabase } from "@/db/DatabaseProvider";
import { updateCharacterCurrency } from "@/db/repositories";
import { useCharacterRow } from "@/hooks/useCharacterRow";
import { useSelectedCharacter } from "@/stores/CharacterContext";
import { useTheme } from "@/stores/ThemeContext";
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
  const theme = useTheme();
  const character = useSelectedCharacter();
  const characterRow = useCharacterRow(character.id);

  if (characterRow.error) {
    return (
      <View
        style={{
          backgroundColor: theme.colors.surface,
          padding: theme.spacing.md,
        }}
      >
        <ThemedText variant="body">
          Failed to load currency information
        </ThemedText>
      </View>
    );
  }

  if (characterRow.updatedAt === undefined || characterRow.data === undefined) {
    return null;
  }

  return (
    <CurrencyForm initial={characterRow.data} characterId={character.id} />
  );
};

interface CurrencyFormProps {
  initial: CurrencyValues;
  characterId: number;
}

const CurrencyForm: React.FC<CurrencyFormProps> = ({
  initial,
  characterId,
}) => {
  const theme = useTheme();
  const db = useDatabase();
  const [currencies, setCurrencies] = useState<CurrencyValues>({
    platinum: initial.platinum,
    gold: initial.gold,
    silver: initial.silver,
    copper: initial.copper,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (currency: keyof CurrencyValues, value: string) => {
    const newValue = value === "" ? 0 : Math.max(0, parseInt(value) || 0);
    setCurrencies((prev) => ({
      ...prev,
      [currency]: newValue,
    }));
  };

  const saveUpdate = async () => {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    try {
      await updateCharacterCurrency(db, characterId, currencies);
      router.back();
    } catch (error) {
      console.error("[UpdateCurrencySheet]: Failed to update currency", error);
      setSubmitting(false);
    }
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
      <View style={{ gap: theme.spacing.md }}>
        {CURRENCY_KEYS.map((currency) => (
          <View key={`${currency}-update-view`}>
            <ThemedText
              variant="headline"
              style={{ marginBottom: theme.spacing.xs }}
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
              />
            </View>
          </View>
        ))}
      </View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "flex-end",
        }}
      >
        <Button
          title="Update"
          onPress={saveUpdate}
          testID="update-currency-button"
          size="sm"
          loading={submitting}
          disabled={submitting}
        />
      </View>
    </View>
  );
};

export default UpdateCurrencySheet;
