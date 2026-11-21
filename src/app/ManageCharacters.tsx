import AppHeader from "@/components/Basic/AppHeader";
import Button from "@/components/Basic/Button";
import Input from "@/components/Basic/Input";
import ThemedText from "@/components/Basic/ThemedText";
import { LAST_CHARACTER_ID } from "@/constants/CacheKeys";
import {
  charactersTable,
  itemsTable,
  ledgerTable,
  storageLocationsTable,
} from "@/db/schema";
import { useDatabase } from "@/db/DatabaseProvider";
import { useCharacterContext } from "@/stores/CharacterContext";
import { useTheme } from "@/stores/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { eq } from "drizzle-orm";
import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";

type ManagementAction = "none" | "renaming" | "deleting";

const ManageCharacters = () => {
  const theme = useTheme();
  const db = useDatabase();
  const { state, selectCharacter, clearCharacter } = useCharacterContext();
  const [action, setAction] = useState<ManagementAction>("none");
  const [renameInput, setRenameInput] = useState("");

  if (state.status !== "characterSelected") {
    return null;
  }

  const character = state.character;

  const saveRename = async () => {
    const trimmed = renameInput.trim();
    if (trimmed.length === 0) {
      return;
    }

    await db
      .update(charactersTable)
      .set({ name: trimmed })
      .where(eq(charactersTable.character_id, character.id));
    selectCharacter({ id: character.id, name: trimmed });
    setAction("none");
  };

  const confirmDelete = async () => {
    const target = character;

    await db.delete(itemsTable).where(eq(itemsTable.character_id, target.id));
    await db
      .delete(storageLocationsTable)
      .where(eq(storageLocationsTable.character_id, target.id));
    await db.delete(ledgerTable).where(eq(ledgerTable.character_id, target.id));
    await db
      .delete(charactersTable)
      .where(eq(charactersTable.character_id, target.id));

    const remaining = await db
      .select()
      .from(charactersTable)
      .orderBy(charactersTable.character_id);
    const next = remaining[0];

    if (next === undefined) {
      await AsyncStorage.removeItem(LAST_CHARACTER_ID);
      clearCharacter();
      router.replace("/");
      return;
    }

    await AsyncStorage.setItem(
      LAST_CHARACTER_ID,
      next.character_id.toString(),
    );
    selectCharacter({ id: next.character_id, name: next.name });
    setAction("none");
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AppHeader title="Manage Characters" />
      <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        padding: theme.spacing.md,
        gap: theme.spacing.lg,
      }}
    >
      <ThemedText variant="headline">{character.name}</ThemedText>

      {action === "none" && (
        <View style={{ gap: theme.spacing.sm }}>
          <Button
            title="Rename Character"
            variant="secondary"
            fullWidth
            testID="rename-character-button"
            onPress={() => {
              setRenameInput(character.name);
              setAction("renaming");
            }}
          />
          <Button
            title="Delete Character"
            variant="secondary"
            fullWidth
            testID="delete-character-button"
            onPress={() => {
              setAction("deleting");
            }}
          />
        </View>
      )}

      {action === "renaming" && (
        <View style={{ gap: theme.spacing.sm }}>
          <Input
            value={renameInput}
            onChangeText={setRenameInput}
            placeholder="Character Name"
            testID="character-rename-input"
          />
          <View style={{ flexDirection: "row", gap: theme.spacing.sm }}>
            <Button
              title="Save"
              testID="character-rename-save"
              onPress={saveRename}
              disabled={renameInput.trim().length === 0}
            />
            <Button
              title="Cancel"
              variant="secondary"
              testID="character-rename-cancel"
              onPress={() => {
                setAction("none");
              }}
            />
          </View>
        </View>
      )}

      {action === "deleting" && (
        <View style={{ gap: theme.spacing.sm }}>
          <Button
            title="Confirm Delete"
            testID="character-delete-confirm"
            onPress={confirmDelete}
          />
          <Button
            title="Cancel"
            variant="secondary"
            testID="character-delete-cancel"
            onPress={() => {
              setAction("none");
            }}
          />
        </View>
      )}
    </ScrollView>
    </View>
  );
};

export default ManageCharacters;
