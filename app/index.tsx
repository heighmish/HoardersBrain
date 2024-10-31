import { Button, Text, TextInput, View } from "react-native";
import React, { useEffect, useRef, useState } from "react";
import { charactersTable } from "../db/schema";
import { useDatabase } from "@/db/DatabaseProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LAST_CHARACTER_ID } from "@/constants/StorageKeys";

export default function Index() {
  const db = useDatabase();

  const [currentCharacterId, setCurrentCharacterId] = useState<null | string>(
    null,
  );
  const [charNameInput, setCharNameInput] = useState<string>("");

  useEffect(() => {
    const loadLastCharacterId = async () => {
      try {
        setCurrentCharacterId(await AsyncStorage.getItem(LAST_CHARACTER_ID));
      } catch (error) {
        console.error("Error loading last used character id", error);
        setCurrentCharacterId(null);
      }
    };
    loadLastCharacterId();
  }, []);

  if (currentCharacterId === null) {
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
                name: charactersTable.name,
              });

            const charId = createdChar[0].id.toString();
            setCurrentCharacterId(charId);
            await AsyncStorage.setItem(LAST_CHARACTER_ID, charId);
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
        alignItems: "center",
        width: "100%",
        height: "100%",
        justifyContent: "center",
      }}
    >
      <Text>Main page</Text>
    </View>
  );
}
