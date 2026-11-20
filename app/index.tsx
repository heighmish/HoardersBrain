import { LAST_CHARACTER_ID } from "@/constants/CacheKeys";
import { useDatabase } from "@/db/DatabaseProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { charactersTable } from "@/db/schema";
import { Colours, defaultStyles } from "@/constants/Styles";
import { Redirect } from "expo-router";
import { useCharacterContext } from "@/stores/CharacterContext";

export default function Index() {
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

    await AsyncStorage.setItem(LAST_CHARACTER_ID, created.id.toString());
    selectCharacter({ id: created.id, name: created.name });
  };

  return (
    <View style={[defaultStyles.container, { justifyContent: "center" }]}>
      <Text style={defaultStyles.sectionHeader}>Please create a character</Text>
      <TextInput
        value={charNameInput}
        onChangeText={setCharNameInput}
        placeholder={"Character Name"}
        style={defaultStyles.textInput}
        placeholderTextColor={Colours.gray}
        testID="character-name-input"
      />
      <Pressable
        accessibilityRole="button"
        testID="create-character-button"
        style={({ pressed }) => [
          defaultStyles.pillButton,
          {
            backgroundColor: Colours.primary,
          },
          pressed && { opacity: 0.6 },
        ]}
        onPress={createCharacter}
      >
        <Text style={defaultStyles.buttonText}>Create Character</Text>
      </Pressable>
    </View>
  );
}
