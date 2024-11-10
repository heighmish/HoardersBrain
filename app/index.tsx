import { LAST_CHARACTER_ID } from "@/constants/CacheKeys";
import { useDatabase } from "@/db/DatabaseProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";
import { charactersTable } from "@/db/schema";
import { Colours, defaultStyles } from "@/constants/Styles";
import { Href, router } from "expo-router";
import { DEFAULT_ID, useCharacterContext } from "@/stores/CharacterContext";

export default function Index() {
  const db = useDatabase();
  const characterContext = useCharacterContext();
  const [charNameInput, setCharNameInput] = useState<string>("");
  useEffect(() => {
    if (characterContext.character.id !== DEFAULT_ID) {
      console.log(
        `Routing to existing character: ${characterContext.character.id}`,
      );
      router.replace(`${characterContext.character.id}/inventory` as Href);
    }
  }, [characterContext.character]);

  return (
    <View style={[defaultStyles.container, { justifyContent: "center" }]}>
      <Text style={defaultStyles.sectionHeader}>Please create a character</Text>
      <TextInput
        value={charNameInput}
        onChangeText={setCharNameInput}
        placeholder={"Character Name"}
        style={defaultStyles.textInput}
        placeholderTextColor={Colours.gray}
      />
      <TouchableOpacity
        style={[
          defaultStyles.pillButton,
          {
            backgroundColor: Colours.primary,
          },
        ]}
        onPress={async () => {
          if (charNameInput.trim().length === 0) {
            console.log("Create character called with empty string");
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
          router.replace(`${id}/inventory` as Href);
        }}
      >
        <Text style={defaultStyles.buttonText}>Create Character</Text>
      </TouchableOpacity>
    </View>
  );
}
