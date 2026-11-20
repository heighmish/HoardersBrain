import { LAST_CHARACTER_ID } from "@/constants/CacheKeys";
import { useDatabase } from "@/db/DatabaseProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { charactersTable } from "@/db/schema";
import { Colours, defaultStyles } from "@/constants/Styles";
import { Href, Redirect } from "expo-router";
import { DEFAULT_ID, useCharacterContext } from "@/stores/CharacterContext";

export default function Index() {
  const db = useDatabase();
  const characterContext = useCharacterContext();
  const [charNameInput, setCharNameInput] = useState<string>("");

  if (!characterContext.isLoaded) {
    return null;
  }

  if (characterContext.character.id !== DEFAULT_ID) {
    return <Redirect href={"/(tabs)" as Href} />;
  }

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
        onPress={async () => {
          if (charNameInput.trim().length === 0) {
            return;
          }
          const createdChar = await db
            .insert(charactersTable)
            .values({
              name: charNameInput,
            })
            .returning({
              id: charactersTable.character_id,
              name: charactersTable.name,
            });

          const { id, name } = createdChar[0];
          await AsyncStorage.setItem(LAST_CHARACTER_ID, id.toString());
          characterContext.updateCharacter({
            id: id,
            name: name,
          });
        }}
      >
        <Text style={defaultStyles.buttonText}>Create Character</Text>
      </Pressable>
    </View>
  );
}
