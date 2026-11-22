import AppHeader from "@/components/Basic/AppHeader";
import Badge from "@/components/Basic/Badge";
import Button from "@/components/Basic/Button";
import Input from "@/components/Basic/Input";
import NumericInput from "@/components/Basic/NumericInput";
import ScreenState from "@/components/Basic/ScreenState";
import ThemedText from "@/components/Basic/ThemedText";
import { RarityArray } from "@/constants/databaseTypes";
import { rarityColors } from "@/constants/rarity";
import { useDatabase } from "@/db/DatabaseProvider";
import {
  createStorageContainer,
  StorageInput,
  updateStorageContainer,
} from "@/db/repositories";
import type { Storage } from "@/db/schema";
import { useActiveStorage } from "@/hooks/useActiveStorage";
import { useCharacterRow } from "@/hooks/useCharacterRow";
import { useSelectedCharacter } from "@/stores/CharacterContext";
import { useTheme } from "@/stores/ThemeContext";
import { parseIdParam } from "@/utils/params";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  View,
  ViewStyle,
} from "react-native";

const CreateStorageForm = () => {
  const { storageId } = useLocalSearchParams<{ storageId?: string }>();
  const editingId = parseIdParam(storageId);

  if (editingId === null) {
    return <StorageForm initialStorage={null} />;
  }
  return <EditStorageLoader storageId={editingId} />;
};

const EditStorageLoader = ({ storageId }: { storageId: number }) => {
  const storage = useActiveStorage(storageId);

  if (storage.error) {
    return (
      <ScreenState
        kind="message"
        title="Edit storage"
        message="Failed to load storage container"
      />
    );
  }

  if (storage.updatedAt === undefined) {
    return <ScreenState kind="loading" title="Edit storage" />;
  }

  if (storage.data === undefined) {
    return (
      <ScreenState
        kind="message"
        title="Edit storage"
        message="Storage container not found."
      />
    );
  }

  return <StorageForm initialStorage={storage.data} />;
};

interface StorageFormProps {
  initialStorage: Storage | null;
}

const StorageForm = ({ initialStorage }: StorageFormProps) => {
  const theme = useTheme();
  const db = useDatabase();
  const character = useSelectedCharacter();
  const isEditing = initialStorage !== null;

  const characterId = initialStorage?.character_id ?? character.id;
  const characterRow = useCharacterRow(characterId);
  const showWeight = characterRow.data?.weight_tracking !== false;

  const [storageInput, setStorageInput] = useState<StorageInput>({
    name: initialStorage?.name ?? "",
    description: initialStorage?.description ?? null,
    carrying: initialStorage?.carrying ?? true,
    rarity: initialStorage?.rarity ?? "Common",
    character_id: initialStorage?.character_id ?? character.id,
    is_fixed_weight: initialStorage?.is_fixed_weight ?? false,
    properties: initialStorage?.properties ?? null,
  });

  const [weightText, setWeightText] = useState(
    initialStorage === null ? "0" : String(initialStorage.weight),
  );
  const [submitting, setSubmitting] = useState(false);

  const adjustWeight = (delta: number) => {
    setWeightText(String(Math.max(0, (parseFloat(weightText) || 0) + delta)));
  };

  const submit = async () => {
    if (storageInput.name === "" || submitting) {
      return;
    }

    const values = {
      ...storageInput,
      weight: showWeight
        ? Math.max(0, parseFloat(weightText) || 0)
        : (initialStorage?.weight ?? 0),
    };

    setSubmitting(true);
    try {
      if (initialStorage === null) {
        await createStorageContainer(db, values);
      } else {
        await updateStorageContainer(
          db,
          initialStorage.storage_location_id,
          values,
        );
      }
      router.back();
    } catch (error) {
      console.error(
        "[CreateStorageForm]: Failed to save storage container",
        error,
      );
      setSubmitting(false);
    }
  };

  const switchRowStyle = (pressed: boolean): ViewStyle => ({
    flexDirection: "row",
    gap: theme.spacing.md,
    alignItems: "center",
    paddingVertical: theme.spacing.xs,
    opacity: pressed ? 0.7 : 1,
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: theme.colors.background }}
    >
      <AppHeader title={isEditing ? "Edit storage" : "Create new storage"} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: theme.spacing.md,
          gap: theme.spacing.sm,
        }}
      >
        <Input
          placeholder="Name"
          value={storageInput.name}
          testID="storage-name-input"
          onChangeText={(text) =>
            setStorageInput((prev) => ({ ...prev, name: text }))
          }
        />
        <Input
          placeholder="Description"
          value={storageInput.description ?? ""}
          testID="storage-description-input"
          onChangeText={(text) =>
            setStorageInput((prev) => ({ ...prev, description: text }))
          }
        />

        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: theme.spacing.xs,
          }}
        >
          {RarityArray.map((rarity) => (
            <Pressable
              onPress={() =>
                setStorageInput((prev) => ({
                  ...prev,
                  rarity: rarity,
                }))
              }
              key={`create-storage-rarity-${rarity}`}
              accessibilityRole="button"
              accessibilityState={{ selected: storageInput.rarity === rarity }}
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
              testID={`storage-rarity-${rarity}`}
            >
              <Badge
                text={rarity}
                color={rarityColors[rarity]}
                filled={storageInput.rarity === rarity}
              />
            </Pressable>
          ))}
        </View>

        {showWeight ? (
          <>
            <ThemedText variant="headline">Weight?</ThemedText>
            <NumericInput
              value={weightText}
              testID="storage-weight-input"
              onChangeText={setWeightText}
              buttonDecrement={() => adjustWeight(-0.5)}
              buttonIncrement={() => adjustWeight(0.5)}
            />
          </>
        ) : null}

        {showWeight ? (
          <Pressable
            style={({ pressed }) => switchRowStyle(pressed)}
            accessibilityRole="switch"
            accessibilityState={{ checked: storageInput.is_fixed_weight }}
            onPress={() =>
              setStorageInput((prev) => ({
                ...prev,
                is_fixed_weight: !prev.is_fixed_weight,
              }))
            }
          >
            <ThemedText variant="body">
              Does the storage have a fixed weight?
            </ThemedText>
            <Switch
              value={storageInput.is_fixed_weight}
              onValueChange={(value) =>
                setStorageInput((prev) => ({
                  ...prev,
                  is_fixed_weight: value,
                }))
              }
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.accent,
              }}
              testID="fixed-weight-toggle"
            />
          </Pressable>
        ) : null}

        <Pressable
          style={({ pressed }) => switchRowStyle(pressed)}
          accessibilityRole="switch"
          accessibilityState={{ checked: storageInput.carrying }}
          onPress={() =>
            setStorageInput((prev) => ({
              ...prev,
              carrying: !prev.carrying,
            }))
          }
        >
          <ThemedText variant="body">Are you carrying the storage?</ThemedText>
          <Switch
            value={storageInput.carrying}
            onValueChange={(value) =>
              setStorageInput((prev) => ({
                ...prev,
                carrying: value,
              }))
            }
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.accent,
            }}
            testID="carrying-toggle"
          />
        </Pressable>

        <Button
          title={isEditing ? "Save" : "Create"}
          onPress={submit}
          testID={isEditing ? "save-storage-button" : "create-storage-button"}
          loading={submitting}
          disabled={submitting || storageInput.name === ""}
          fullWidth
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default CreateStorageForm;
