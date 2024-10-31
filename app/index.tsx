import { LAST_CHARACTER_ID } from "@/constants/StorageKeys";
import { useDatabase } from "@/db/DatabaseProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { eq } from "drizzle-orm";
import React, { useEffect, useState } from "react";
import { Button, Text, TextInput, View } from "react-native";
import Inventory from "../components/Inventory";
import { Character, charactersTable } from "../db/schema";

export default function Index() {
  const db = useDatabase();

  const [charNameInput, setCharNameInput] = useState<string>("");
  const [char, setChar] = useState<Character>();

  useEffect(() => {
    const loadLastCharacter = async () => {
      try {
        const charId = await AsyncStorage.getItem(LAST_CHARACTER_ID);
        const character = await db
          .select()
          .from(charactersTable)
          .where(eq(charactersTable.character_id, Number(charId)));
        setChar(character[0]);
      } catch (error) {
        console.error("Error loading last used character id", error);
      }
    };
    loadLastCharacter();
  }, [db]);

  if (!char) {
    return (
      <View>
        <Text>Please create a character</Text>
        <TextInput value={charNameInput} onChangeText={setCharNameInput} />
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

            const characterData = await db
              .select()
              .from(charactersTable)
              .where(eq(charactersTable.character_id, charId));

            setChar(characterData[0]);
          }}
        />
      </View>
    );
  }

  return (
    <View
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        paddingHorizontal: 16,
      }}
    >
      <Inventory character={char} />
    </View>
  );
}
