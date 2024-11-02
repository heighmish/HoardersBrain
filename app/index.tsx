import { LAST_CHARACTER_ID } from "@/constants/StorageKeys";
import { useDatabase } from "@/db/DatabaseProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import { Button, Text, TextInput, View } from "react-native";
import Inventory from "../components/Inventory";
import { charactersTable } from "@/db/schema";

export default function Index() {
  const db = useDatabase();

  const [charNameInput, setCharNameInput] = useState<string>("");
  const [charId, setCharId] = useState<number | null>(null);

  useEffect(() => {
    const loadLastCharacter = async () => {
      try {
        const charId = await AsyncStorage.getItem(LAST_CHARACTER_ID);
        setCharId(Number(charId));
      } catch (error) {
        console.error("Error loading last used character id", error);
      }
    };
    loadLastCharacter();
  }, [db]);

  if (!charId) {
    return (
      <View>
        <Text>Please create a character</Text>
        <TextInput
          value={charNameInput}
          onChangeText={setCharNameInput}
          placeholder={"Character Name"}
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
            setCharId(charId);
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
      <Inventory characterId={charId} />
    </View>
  );
}
