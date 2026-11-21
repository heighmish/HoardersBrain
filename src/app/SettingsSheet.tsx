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
import { AntDesign } from "@expo/vector-icons";
import { eq } from "drizzle-orm";
import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

type ManagementAction = "none" | "renaming" | "deleting";

const SettingsSheet = () => {
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

  const subhead = (text: string) => (
    <ThemedText
      variant="caption"
      style={{ textTransform: "uppercase", letterSpacing: 0.5 }}
    >
      {text}
    </ThemedText>
  );

  const linkRow = (label: string, testID: string, onPress: () => void) => (
    <Pressable
      accessibilityRole="button"
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: theme.spacing.sm,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <ThemedText variant="body">{label}</ThemedText>
      <AntDesign name="right" size={16} color={theme.colors.textMuted} />
    </Pressable>
  );

  return (
    <ScrollView
      style={{ backgroundColor: theme.colors.surface }}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        padding: theme.spacing.md,
        paddingTop: theme.spacing.xl,
        gap: theme.spacing.md,
      }}
    >
      <ThemedText variant="title">Settings</ThemedText>

      <View style={{ gap: theme.spacing.sm }}>
        {subhead("Character customization")}
        {linkRow("Encumbrance & weight", "settings-encumbrance-row", () => {
          router.push("/CharacterSettingsSheet");
        })}
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        {subhead("App customization")}
        {linkRow("Theme", "settings-theme-row", () => {
          router.push("/ThemeSettingsSheet");
        })}
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        {subhead("Character management")}
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
      </View>
    </ScrollView>
  );
};

export default SettingsSheet;
