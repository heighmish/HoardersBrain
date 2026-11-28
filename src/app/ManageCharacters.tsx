import AppHeader from "@/components/Basic/AppHeader";
import Button from "@/components/Basic/Button";
import Input from "@/components/Basic/Input";
import ThemedText from "@/components/Basic/ThemedText";
import { useDatabase } from "@/db/DatabaseProvider";
import { renameCharacter, softDeleteCharacter } from "@/db/repositories";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { useCharacterContext } from "@/stores/CharacterContext";
import { useTheme } from "@/stores/ThemeContext";
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
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const renameAction = useAsyncAction();
  const deleteAction = useAsyncAction({ keepBusyOnSuccess: true });
  const submitting = renameAction.submitting || deleteAction.submitting;

  if (state.status !== "characterSelected") {
    return null;
  }

  const character = state.character;
  const confirmMatches = deleteConfirmText.trim() === character.name.trim();

  const saveRename = () => {
    const trimmed = renameInput.trim();
    if (trimmed.length === 0) {
      return;
    }

    renameAction.run(async () => {
      await renameCharacter(db, character.id, trimmed);
      selectCharacter({ id: character.id, name: trimmed });
      setAction("none");
    }, "Failed to update character.");
  };

  const confirmDelete = () => {
    if (!confirmMatches) {
      return;
    }

    deleteAction.run(async () => {
      const next = await softDeleteCharacter(db, character.id);

      if (next === undefined) {
        clearCharacter();
        router.replace("/");
        return;
      }

      selectCharacter({ id: next.character_id, name: next.name });
      setDeleteConfirmText("");
      setAction("none");
      router.back();
    }, "Failed to update character.");
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
                setDeleteConfirmText("");
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
            {renameAction.error !== null && (
              <ThemedText
                variant="caption"
                style={{ color: theme.colors.error }}
              >
                {renameAction.error}
              </ThemedText>
            )}
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
                  renameAction.clearError();
                  setAction("none");
                }}
                disabled={submitting}
              />
            </View>
          </View>
        )}

        {action === "deleting" && (
          <View style={{ gap: theme.spacing.sm }}>
            <ThemedText variant="headline">Delete character?</ThemedText>
            <ThemedText variant="subhead">
              Type the character name to confirm.
            </ThemedText>
            <Input
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder={character.name}
              testID="character-delete-confirm-input"
            />
            {deleteAction.error !== null && (
              <ThemedText
                variant="caption"
                style={{ color: theme.colors.error }}
              >
                {deleteAction.error}
              </ThemedText>
            )}
            <Button
              title="Confirm Delete"
              testID="character-delete-confirm"
              onPress={confirmDelete}
              loading={submitting}
              disabled={submitting || !confirmMatches}
            />
            <Button
              title="Cancel"
              variant="secondary"
              testID="character-delete-cancel"
              onPress={() => {
                deleteAction.clearError();
                setDeleteConfirmText("");
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
