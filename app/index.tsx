import { LAST_CHARACTER_ID } from "@/constants/CacheKeys";
import { useDatabase } from "@/db/DatabaseProvider";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { charactersTable } from "@/db/schema";
import { Redirect } from "expo-router";
import { useCharacterContext } from "@/stores/CharacterContext";
import { useTheme } from "@/stores/ThemeContext";
import Button from "@/components/Basic/Button";

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
      <View style={{ gap: theme.spacing.xs }}>
        <Text style={theme.type.title}>Please create a character</Text>
        <Text
          style={[theme.type.subhead, { color: theme.colors.accentSecondary }]}
        >
          Every great hoard begins with a mind.
        </Text>
      </View>
      <TextInput
        value={charNameInput}
        onChangeText={setCharNameInput}
        placeholder={"Character Name"}
        placeholderTextColor={theme.colors.textMuted}
        style={{
          backgroundColor: theme.colors.surface,
          color: theme.colors.text,
          borderColor: theme.colors.border,
          borderWidth: 1,
          borderRadius: theme.radius.md,
          borderCurve: "continuous",
          padding: theme.spacing.md,
          fontSize: 17,
        }}
        testID="character-name-input"
      />
      <Button
        title="Create Character"
        onPress={createCharacter}
        testID="create-character-button"
        style={{ alignSelf: "stretch", height: 60 }}
      />
    </View>
  );
}
