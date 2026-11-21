import Button from "@/components/Basic/Button";
import Input from "@/components/Basic/Input";
import ThemedText from "@/components/Basic/ThemedText";
import { ON_PERSON_NAME } from "@/components/itemOperations";
import { LAST_CHARACTER_ID } from "@/constants/CacheKeys";
import { useDatabase } from "@/db/DatabaseProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useState } from "react";
import { View } from "react-native";
import { charactersTable, storageLocationsTable } from "@/db/schema";
import { Redirect } from "expo-router";
import { useCharacterContext } from "@/stores/CharacterContext";
import { useTheme } from "@/stores/ThemeContext";

export default function Index() {
  const theme = useTheme();
  const db = useDatabase();
  const { state, selectCharacter } = useCharacterContext();
  const [charNameInput, setCharNameInput] = useState<string>("");

  if (state.status === "loading") {
    return null;
  }

  if (state.status === "characterSelected") {
    return <Redirect href="/(tabs)" />;
  }

  const createCharacter = async () => {
    const trimmedName = charNameInput.trim();
    if (trimmedName.length === 0) {
      return;
    }

    const createdCharacters = await db
      .insert(charactersTable)
      .values({
        name: trimmedName,
      })
      .returning({
        id: charactersTable.character_id,
        name: charactersTable.name,
      });

    const created = createdCharacters[0];
    if (created === undefined) {
      return;
    }

    await db.insert(storageLocationsTable).values({
      character_id: created.id,
      name: ON_PERSON_NAME,
      weight: 0,
      carrying: true,
      is_fixed_weight: true,
    });

    await AsyncStorage.setItem(LAST_CHARACTER_ID, created.id.toString());
    selectCharacter({ id: created.id, name: created.name });
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
        style={{ height: 60 }}
      />
    </View>
  );
}
