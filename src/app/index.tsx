import Button from "@/components/Basic/Button";
import Input from "@/components/Basic/Input";
import ThemedText from "@/components/Basic/ThemedText";
import { useDatabase } from "@/db/DatabaseProvider";
import { createCharacterWithDefaultContainer } from "@/db/repositories";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { useCharacterContext } from "@/stores/CharacterContext";
import { useTheme } from "@/stores/ThemeContext";
import { Redirect } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";

export default function Index() {
  const theme = useTheme();
  const db = useDatabase();
  const { state, selectCharacter } = useCharacterContext();
  const [charNameInput, setCharNameInput] = useState<string>("");
  const { submitting, error, run } = useAsyncAction({
    keepBusyOnSuccess: true,
  });

  if (state.status === "loading") {
    return null;
  }

  if (state.status === "characterSelected") {
    return <Redirect href="/(tabs)" />;
  }

  const createCharacter = () => {
    const trimmedName = charNameInput.trim();
    if (trimmedName.length === 0) {
      return;
    }

    run(async () => {
      const created = await createCharacterWithDefaultContainer(
        db,
        trimmedName,
      );
      selectCharacter({ id: created.id, name: created.name });
    }, "Failed to create character.");
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        justifyContent: "center",
        padding: theme.spacing.md,
        gap: theme.spacing.md,
      }}
    >
      <ThemedText variant="title">Please create a character</ThemedText>
      <Input
        value={charNameInput}
        onChangeText={setCharNameInput}
        placeholder={"Character Name"}
        testID="character-name-input"
      />
      {error !== null && (
        <ThemedText variant="caption" style={{ color: theme.colors.error }}>
          {error}
        </ThemedText>
      )}
      <Button
        title="Create Character"
        onPress={createCharacter}
        testID="create-character-button"
        fullWidth
        loading={submitting}
        disabled={submitting || charNameInput.trim().length === 0}
        style={{ height: 60 }}
      />
    </View>
  );
}
