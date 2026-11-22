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
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { useCharacter } from "@/hooks/useCharacter";
import { useContainer } from "@/hooks/useContainer";
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

const returnToInventory = () =>
  router.canGoBack() ? router.back() : router.replace("/(tabs)");

const CreateStorageForm = () => {
  const theme = useTheme();
  const { storageId } = useLocalSearchParams<{ storageId?: string }>();
  const editingId = parseIdParam(storageId);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AppHeader
        title={editingId === null ? "Create new storage" : "Edit storage"}
      />
      {editingId === null ? (
        <StorageForm initialStorage={null} />
      ) : (
        <EditStorageLoader storageId={editingId} />
      )}
    </View>
  );
};

const EditStorageLoader = ({ storageId }: { storageId: number }) => {
  const storage = useContainer(storageId);

  if (storage.status === "error") {
    return (
      <ScreenState
        kind="message"
        message="Failed to load storage container"
        actionLabel="Back"
        onAction={returnToInventory}
      />
    );
  }

  if (storage.status === "loading") {
    return <ScreenState kind="loading" />;
  }

  if (storage.status === "missing") {
    return (
      <ScreenState
        kind="message"
        message="Storage container not found."
        actionLabel="Back"
        onAction={returnToInventory}
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
  const { submitting, error, run } = useAsyncAction({
    keepBusyOnSuccess: true,
  });

  const characterId = initialStorage?.character_id ?? character.id;
  const characterQuery = useCharacter(characterId);
  const showWeight =
    characterQuery.status !== "ready" ||
    characterQuery.data.weight_tracking !== false;

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

  const adjustWeight = (delta: number) => {
    setWeightText(String(Math.max(0, (parseFloat(weightText) || 0) + delta)));
  };

  const submit = () => {
    if (storageInput.name === "") {
      return;
    }

    const values = {
      ...storageInput,
      weight: showWeight
        ? Math.max(0, parseFloat(weightText) || 0)
        : (initialStorage?.weight ?? 0),
    };

    run(async () => {
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
    }, "Failed to save storage.");
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
      style={{ flex: 1 }}
    >
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

        {error !== null && (
          <ThemedText variant="caption" style={{ color: theme.colors.error }}>
            {error}
          </ThemedText>
        )}

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
