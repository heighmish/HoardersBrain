import Button from "@/components/Basic/Button";
import NumericInput from "@/components/Basic/NumericInput";
import ThemedText from "@/components/Basic/ThemedText";
import { useDatabase } from "@/db/DatabaseProvider";
import { updateCharacterCurrency } from "@/db/repositories";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { useCharacter } from "@/hooks/useCharacter";
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
  const characterQuery = useCharacter(character.id);

  if (characterQuery.status === "error") {
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

  if (characterQuery.status !== "ready") {
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
  const { submitting, error, run } = useAsyncAction({
    keepBusyOnSuccess: true,
  });

  const handleChange = (currency: keyof CurrencyValues, value: string) => {
    const newValue = value === "" ? 0 : Math.max(0, parseInt(value) || 0);
    setCurrencies((prev) => ({
      ...prev,
      [currency]: newValue,
    }));
  };

  const saveUpdate = () => {
    run(async () => {
      await updateCharacterCurrency(db, characterId, currencies);
      router.back();
    }, "Failed to update currency.");
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
      {error !== null && (
        <ThemedText variant="caption" style={{ color: theme.colors.error }}>
          {error}
        </ThemedText>
      )}
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
