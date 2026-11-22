import Button from "@/components/Basic/Button";
import Input from "@/components/Basic/Input";
import ThemedText from "@/components/Basic/ThemedText";
import { LAST_CHARACTER_ID } from "@/constants/CacheKeys";
import { useDatabase } from "@/db/DatabaseProvider";
import { createCharacterWithDefaultContainer } from "@/db/repositories";
import { useCharacterContext } from "@/stores/CharacterContext";
import { useTheme } from "@/stores/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect } from "expo-router";
import React, { useState } from "react";
import { View } from "react-native";

export default function Index() {
  const theme = useTheme();
  const db = useDatabase();
  const { state, selectCharacter } = useCharacterContext();
  const [charNameInput, setCharNameInput] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  if (state.status === "loading") {
    return null;
  }

  if (state.status === "characterSelected") {
    return <Redirect href="/(tabs)" />;
  }

  const createCharacter = async () => {
    const trimmedName = charNameInput.trim();
    if (trimmedName.length === 0 || submitting) {
      return;
    }

    setSubmitting(true);
    try {
      const created = await createCharacterWithDefaultContainer(
        db,
        trimmedName,
      );
      await AsyncStorage.setItem(LAST_CHARACTER_ID, created.id.toString());
      selectCharacter({ id: created.id, name: created.name });
    } catch (error) {
      console.error("[Index]: Failed to create character", error);
      setSubmitting(false);
    }
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
