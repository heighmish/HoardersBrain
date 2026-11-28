import AppHeader from "@/components/Basic/AppHeader";
import Button from "@/components/Basic/Button";
import NumericInput from "@/components/Basic/NumericInput";
import ScreenState from "@/components/Basic/ScreenState";
import ThemedText from "@/components/Basic/ThemedText";
import { useDatabase } from "@/db/DatabaseProvider";
import { updateCharacterSettings } from "@/db/repositories";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { useCharacter } from "@/hooks/useCharacter";
import { useSelectedCharacter } from "@/stores/CharacterContext";
import { useTheme } from "@/stores/ThemeContext";
import { parsePositiveInt, stepIntText } from "@/utils/numbers";
import { router } from "expo-router";
import React, { useState } from "react";
import { Switch, View } from "react-native";

const returnToInventory = () =>
  router.canGoBack() ? router.back() : router.replace("/(tabs)");

const CharacterSettings = () => {
  const theme = useTheme();
  const character = useSelectedCharacter();

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AppHeader title="Encumbrance & Weight" />
      <CharacterSettingsBody characterId={character.id} />
    </View>
  );
};

const CharacterSettingsBody = ({ characterId }: { characterId: number }) => {
  const characterQuery = useCharacter(characterId);

  if (characterQuery.status === "error") {
    return (
      <ScreenState
        kind="message"
        message="Failed to load character settings"
        actionLabel="Back"
        onAction={returnToInventory}
      />
    );
  }

  if (characterQuery.status === "loading") {
    return <ScreenState kind="loading" />;
  }

  if (characterQuery.status === "missing") {
    return (
      <ScreenState
        kind="message"
        message="Character not found."
        actionLabel="Back"
        onAction={returnToInventory}
      />
    );
  }

  return (
    <CharacterSettingsForm
      initial={characterQuery.data}
      characterId={characterId}
    />
  );
};

interface CharacterSettingsFormProps {
  initial: { max_encumbrance: number; weight_tracking: boolean };
  characterId: number;
}

const CharacterSettingsForm: React.FC<CharacterSettingsFormProps> = ({
  initial,
  characterId,
}) => {
  const theme = useTheme();
  const db = useDatabase();
  const [maxEncumbranceInput, setMaxEncumbranceInput] = useState(
    initial.max_encumbrance.toFixed(0),
  );
  const [weightTracking, setWeightTracking] = useState(initial.weight_tracking);
  const { submitting, error, run } = useAsyncAction({
    keepBusyOnSuccess: true,
  });

  const parsedMaxEncumbrance = parsePositiveInt(maxEncumbranceInput);

  const stepMaxEncumbrance = (delta: number) => {
    setMaxEncumbranceInput((current) =>
      parsePositiveInt(current) === null
        ? current
        : stepIntText(current, delta, { min: 1 }),
    );
  };

  const saveSettings = () => {
    if (parsedMaxEncumbrance === null) {
      return;
    }

    run(async () => {
      await updateCharacterSettings(db, characterId, {
        max_encumbrance: parsedMaxEncumbrance,
        weight_tracking: weightTracking,
      });
      router.back();
    }, "Failed to save settings.");
  };

  return (
    <View
      style={{
        flex: 1,
        padding: theme.spacing.md,
        gap: theme.spacing.lg,
      }}
    >
      <View style={{ gap: theme.spacing.sm }}>
        <ThemedText variant="headline">Max Encumbrance</ThemedText>
        <NumericInput
          value={maxEncumbranceInput}
          onChangeText={setMaxEncumbranceInput}
          buttonIncrement={() => stepMaxEncumbrance(1)}
          buttonDecrement={() => stepMaxEncumbrance(-1)}
          placeholder="100"
          testID="character-max-encumbrance-input"
        />
        {parsedMaxEncumbrance === null && (
          <ThemedText
            variant="caption"
            style={{ color: theme.colors.error }}
            testID="character-max-encumbrance-error"
          >
            Enter a whole number greater than 0
          </ThemedText>
        )}
      </View>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <ThemedText variant="headline">Weight Tracking</ThemedText>
        {/* iOS Switch never surfaces testID to the native tree; the wrapper carries the device-facing id. */}
        <View testID="character-weight-tracking-toggle">
          <Switch
            value={weightTracking}
            onValueChange={setWeightTracking}
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.accent,
            }}
            testID="character-weight-tracking-switch"
          />
        </View>
      </View>
      {error !== null && (
        <ThemedText variant="caption" style={{ color: theme.colors.error }}>
          {error}
        </ThemedText>
      )}
      <Button
        title="Save"
        onPress={saveSettings}
        testID="character-settings-save"
        loading={submitting}
        disabled={submitting || parsedMaxEncumbrance === null}
        fullWidth
      />
    </View>
  );
};

export default CharacterSettings;
