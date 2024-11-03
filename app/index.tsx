import { LAST_CHARACTER_ID } from "@/constants/StorageKeys";
import { useDatabase } from "@/db/DatabaseProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import { Button, Text, TextInput, View } from "react-native";
import { charactersTable } from "@/db/schema";
import { eq } from "drizzle-orm";
import { defaultStyles } from "@/constants/Styles";
import { Href, router } from "expo-router";
import Colours from "@/constants/Colors";

export default function Index() {
  const db = useDatabase();
  const [charNameInput, setCharNameInput] = useState<string>("");

  useEffect(() => {
    const loadLastCharacter = async () => {
      try {
        const charId = await AsyncStorage.getItem(LAST_CHARACTER_ID);
        const character = await db.query.charactersTable.findFirst({
          where: eq(charactersTable.character_id, Number(charId)),
        });
        if (character !== undefined) {
          router.replace(`${charId}/inventory` as Href);
        }
      } catch (error) {
        console.error("Error loading last used character id", error);
      }
    };
    loadLastCharacter();
  }, [db]);

  return (
    <View style={[defaultStyles.container, { justifyContent: "center" }]}>
      <Text style={defaultStyles.sectionHeader}>Please create a character</Text>
      <TextInput
        value={charNameInput}
        onChangeText={setCharNameInput}
        placeholder={"Character Name"}
        style={defaultStyles.textInput}
        placeholderTextColor={Colours.textPlaceholderLight}
      />
      <Button
        title="Create Character"
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
      />
    </View>
  );
}
