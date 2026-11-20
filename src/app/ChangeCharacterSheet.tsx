import Button from "@/components/Basic/Button";
import Input from "@/components/Basic/Input";
import ThemedText from "@/components/Basic/ThemedText";
import { LAST_CHARACTER_ID } from "@/constants/CacheKeys";
import { useDatabase } from "@/db/DatabaseProvider";
import {
  charactersTable,
  itemsTable,
  ledgerTable,
  storageLocationsTable,
} from "@/db/schema";
import { useCharacterContext } from "@/stores/CharacterContext";
import { useTheme } from "@/stores/ThemeContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { eq } from "drizzle-orm";
import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { useState } from "react";

type SheetAction = "none" | "renaming" | "deleting";

const ChangeCharacterSheet = () => {
  const theme = useTheme();
  const db = useDatabase();
  const characters = useLiveQuery(db.query.charactersTable.findMany());
  const { state, selectCharacter, clearCharacter } = useCharacterContext();
  const [action, setAction] = useState<SheetAction>("none");
  const [renameInput, setRenameInput] = useState("");

  const activeCharacter =
    state.status === "characterSelected" ? state.character : undefined;

  if (characters.error) {
    return (
      <View
        style={{
          marginTop: theme.spacing.md,
          marginBottom: theme.spacing.lg,
          backgroundColor: theme.colors.surface,
        }}
      >
        <ThemedText variant="body">Failed to load characters</ThemedText>
      </View>
    );
  }

  if (characters.updatedAt === undefined) {
    return null;
  }

  const saveRename = async () => {
    if (activeCharacter === undefined) {
      return;
    }
    const trimmed = renameInput.trim();
    if (trimmed.length === 0) {
      return;
    }

    await db
      .update(charactersTable)
      .set({ name: trimmed })
      .where(eq(charactersTable.character_id, activeCharacter.id));
    selectCharacter({ id: activeCharacter.id, name: trimmed });
    setAction("none");
  };

  const confirmDelete = async () => {
    if (activeCharacter === undefined) {
      return;
    }
    const target = activeCharacter;

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

    await AsyncStorage.setItem(LAST_CHARACTER_ID, next.character_id.toString());
    selectCharacter({ id: next.character_id, name: next.name });
    setAction("none");
    router.back();
  };

  return (
    <View
      style={{
        marginTop: theme.spacing.md,
        marginBottom: theme.spacing.lg,
        backgroundColor: theme.colors.surface,
        paddingHorizontal: theme.spacing.md,
      }}
    >
      <View style={{ gap: theme.spacing.md }}>
        {characters.data.map((item) => (
          <Pressable
            key={item.character_id}
            accessibilityRole="button"
            testID={`character-row-${item.character_id}`}
            onPress={async () => {
              await AsyncStorage.setItem(
                LAST_CHARACTER_ID,
                item.character_id.toString(),
              );
              selectCharacter({
                id: item.character_id,
                name: item.name,
              });
              setAction("none");
              router.back();
            }}
          >
            <View
              style={{
                flexDirection: "row",
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                width: "100%",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <ThemedText variant="body">{item.name}</ThemedText>
              <View
                style={{
                  backgroundColor:
                    state.status === "characterSelected" &&
                    state.character.id === item.character_id
                      ? theme.colors.accent
                      : "transparent",
                  borderColor: theme.colors.border,
                  borderWidth: 1,
                  height: 25,
                  width: 25,
                  borderRadius: 50,
                }}
              />
            </View>
          </Pressable>
        ))}

        {activeCharacter !== undefined && (
          <View style={{ gap: theme.spacing.md }}>
            {action === "none" && (
              <View style={{ gap: theme.spacing.sm }}>
                <Button
                  title="Rename Character"
                  variant="secondary"
                  fullWidth
                  testID="rename-character-button"
                  onPress={() => {
                    setRenameInput(activeCharacter.name);
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
                <View
                  style={{ flexDirection: "row", gap: theme.spacing.sm }}
                >
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
          </View>
        )}

        <Button
          title="Create new character"
          variant="secondary"
          fullWidth
          onPress={async () => {
            await AsyncStorage.removeItem(LAST_CHARACTER_ID);
            clearCharacter();
            router.replace("/");
          }}
          testID="create-new-character-button"
        />
      </View>
    </View>
  );
};

export default ChangeCharacterSheet;
