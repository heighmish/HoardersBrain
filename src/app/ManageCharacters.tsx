import AppHeader from "@/components/Basic/AppHeader";
import Button from "@/components/Basic/Button";
import Input from "@/components/Basic/Input";
import ThemedText from "@/components/Basic/ThemedText";
import { LAST_CHARACTER_ID } from "@/constants/CacheKeys";
import { useDatabase } from "@/db/DatabaseProvider";
import { renameCharacter, softDeleteCharacter } from "@/db/repositories";
import { useCharacterContext } from "@/stores/CharacterContext";
import { useTheme } from "@/stores/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  const [submitting, setSubmitting] = useState(false);

  if (state.status !== "characterSelected") {
    return null;
  }

  const character = state.character;

  const saveRename = async () => {
    const trimmed = renameInput.trim();
    if (trimmed.length === 0 || submitting) {
      return;
    }

    setSubmitting(true);
    try {
      await renameCharacter(db, character.id, trimmed);
      selectCharacter({ id: character.id, name: trimmed });
      setAction("none");
    } catch (error) {
      console.error("[ManageCharacters]: Failed to rename character", error);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    try {
      const next = await softDeleteCharacter(db, character.id);

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
    } catch (error) {
      console.error("[ManageCharacters]: Failed to delete character", error);
    } finally {
      setSubmitting(false);
    }
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
                loading={submitting}
                disabled={submitting || renameInput.trim().length === 0}
              />
              <Button
                title="Cancel"
                variant="secondary"
                testID="character-rename-cancel"
                onPress={() => {
                  setAction("none");
                }}
                disabled={submitting}
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
              loading={submitting}
              disabled={submitting}
            />
            <Button
              title="Cancel"
              variant="secondary"
              testID="character-delete-cancel"
              onPress={() => {
                setAction("none");
              }}
              disabled={submitting}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default ManageCharacters;
