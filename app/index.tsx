import { LAST_CHARACTER_ID } from "@/constants/CacheKeys";
import { useDatabase } from "@/db/DatabaseProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { charactersTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { defaultStyles } from "@/constants/Styles";
import { Href, router } from "expo-router";
import Colours from "@/constants/Colors";
import { useCharacterContext } from "@/stores/CharacterContext";

export default function Index() {
  const db = useDatabase();
  const characterContext = useCharacterContext();
  const [charNameInput, setCharNameInput] = useState<string>("");

  useEffect(() => {
    // This logic should be moved into the CharacterContext I guess. At least loading the values.
    // Then we can check on mount if value exists and navigate from here
    const loadLastCharacter = async () => {
      try {
        const charId = await AsyncStorage.getItem(LAST_CHARACTER_ID);
        const character = await db.query.charactersTable.findFirst({
          where: eq(charactersTable.character_id, Number(charId)),
        });
        if (character !== undefined) {
          characterContext.updateCharacter({
            id: character.character_id,
            name: character.name,
          });
          router.replace(`${charId}/inventory` as Href);
        }
      } catch (error) {
        console.error("Error loading last used character id", error);
      }
    };
    loadLastCharacter();
  }, [characterContext, db]);

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
            });

          const charId = createdChar[0].id;
          await AsyncStorage.setItem(LAST_CHARACTER_ID, charId.toString());
          router.replace(`${charId}/inventory` as Href);
        }}
      >
        <Text style={defaultStyles.buttonText}>Create Character</Text>
      </TouchableOpacity>
    </View>
  );
}
