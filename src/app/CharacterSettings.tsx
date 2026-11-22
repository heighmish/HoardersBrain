import AppHeader from "@/components/Basic/AppHeader";
import Button from "@/components/Basic/Button";
import NumericInput from "@/components/Basic/NumericInput";
import ScreenState from "@/components/Basic/ScreenState";
import ThemedText from "@/components/Basic/ThemedText";
import { useDatabase } from "@/db/DatabaseProvider";
import { updateCharacterSettings } from "@/db/repositories";
import { useCharacterRow } from "@/hooks/useCharacterRow";
import { useSelectedCharacter } from "@/stores/CharacterContext";
import { useTheme } from "@/stores/ThemeContext";
import { router } from "expo-router";
import React, { useState } from "react";
import { Switch, View } from "react-native";

const SCREEN_TITLE = "Encumbrance & Weight";

const parseMaxEncumbrance = (value: string): number | null => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const CharacterSettings = () => {
  const character = useSelectedCharacter();
  const characterRow = useCharacterRow(character.id);

  if (characterRow.error) {
    return (
      <ScreenState
        kind="message"
        title={SCREEN_TITLE}
        message="Failed to load character settings"
      />
    );
  }

  if (characterRow.updatedAt === undefined) {
    return <ScreenState kind="loading" title={SCREEN_TITLE} />;
  }

  if (characterRow.data === undefined) {
    return (
      <ScreenState
        kind="message"
        title={SCREEN_TITLE}
        message="Character not found."
      />
    );
  }

  return (
    <CharacterSettingsForm
      initial={characterRow.data}
      characterId={character.id}
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
  const [submitting, setSubmitting] = useState(false);

  const parsedMaxEncumbrance = parseMaxEncumbrance(maxEncumbranceInput);

  const stepMaxEncumbrance = (delta: number) => {
    setMaxEncumbranceInput((current) => {
      const parsed = parseMaxEncumbrance(current);
      if (parsed === null) {
        return current;
      }
      return Math.max(1, parsed + delta).toFixed(0);
    });
  };

  const saveSettings = async () => {
    if (parsedMaxEncumbrance === null || submitting) {
      return;
    }

    setSubmitting(true);
    try {
      await updateCharacterSettings(db, characterId, {
        max_encumbrance: parsedMaxEncumbrance,
        weight_tracking: weightTracking,
      });
      router.back();
    } catch (error) {
      console.error("[CharacterSettings]: Failed to save settings", error);
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AppHeader title={SCREEN_TITLE} />
      <View
        style={{
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
        <Button
          title="Save"
          onPress={saveSettings}
          testID="character-settings-save"
          loading={submitting}
          disabled={submitting || parsedMaxEncumbrance === null}
          fullWidth
        />
      </View>
    </View>
  );
};

export default CharacterSettings;
