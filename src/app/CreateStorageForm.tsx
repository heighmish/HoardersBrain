import AppHeader from "@/components/Basic/AppHeader";
import Badge from "@/components/Basic/Badge";
import Button from "@/components/Basic/Button";
import Input from "@/components/Basic/Input";
import NumericInput from "@/components/Basic/NumericInput";
import ThemedText from "@/components/Basic/ThemedText";
import {
  StorageInput,
  updateStorageContainer,
} from "@/components/storageLifecycle";
import { rarityColors } from "@/constants/rarity";
import { RarityArray } from "@/constants/databaseTypes";
import { useDatabase } from "@/db/DatabaseProvider";
import { useTheme } from "@/stores/ThemeContext";
import { Storage, storageLocationsTable } from "@/db/schema";
import { useSelectedCharacter } from "@/stores/CharacterContext";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  View,
} from "react-native";
import { and, eq, isNull } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { charactersTable } from "@/db/schema";

const parseStorageId = (raw: string | undefined): number | null => {
  if (raw === undefined) {
    return null;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
};

const CreateStorageForm = () => {
  const { storageId } = useLocalSearchParams<{ storageId?: string }>();
  const editingId = parseStorageId(storageId);

  if (editingId === null) {
    return <StorageForm initialStorage={null} />;
  }
  return <EditStorageLoader storageId={editingId} />;
};

const EditStorageLoader = ({ storageId }: { storageId: number }) => {
  const theme = useTheme();
  const db = useDatabase();

  const [loadedStorage, setLoadedStorage] = useState<Storage | null | undefined>(
    undefined,
  );

  useEffect(() => {
    const loadStorage = async () => {
      const row = await db.query.storageLocationsTable.findFirst({
        where: and(
          eq(storageLocationsTable.storage_location_id, storageId),
          isNull(storageLocationsTable.deleted_at),
        ),
      });
      setLoadedStorage(row ?? null);
    };
    loadStorage();
  }, [db, storageId]);

  if (loadedStorage === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }} />
    );
  }

  if (loadedStorage === null) {
    return (
      <View
        style={{
          flex: 1,
          padding: theme.spacing.md,
          backgroundColor: theme.colors.background,
        }}
      >
        <ThemedText variant="body">Storage container not found.</ThemedText>
      </View>
    );
  }

  return <StorageForm initialStorage={loadedStorage} />;
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
  const weightSettings = useLiveQuery(
    db.query.charactersTable.findFirst({
      where: eq(charactersTable.character_id, characterId),
      columns: { weight_tracking: true },
    }),
    [characterId],
  );
  const showWeight = weightSettings.data?.weight_tracking !== false;

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

  const submit = async () => {
    if (storageInput.name === "") {
      return;
    }

    const values = {
      ...storageInput,
      weight: showWeight
        ? Math.max(0, parseFloat(weightText) || 0)
        : (initialStorage?.weight ?? 0),
    };

    if (initialStorage === null) {
      await db.insert(storageLocationsTable).values(values);
    } else {
      updateStorageContainer(
        db,
        initialStorage.storage_location_id,
        values,
      );
    }
    router.back();
  };

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

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.xs }}>
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
          style={{ flexDirection: "row", gap: theme.spacing.md, alignItems: "center", paddingVertical: theme.spacing.xs }}
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
          style={{ flexDirection: "row", gap: theme.spacing.md, alignItems: "center", paddingVertical: theme.spacing.xs }}
          accessibilityRole="switch"
          accessibilityState={{ checked: storageInput.carrying }}
          onPress={() =>
            setStorageInput((prev) => ({
              ...prev,
              carrying: !prev.carrying,
            }))
          }
        >
          <ThemedText variant="body">
            Are you carrying the storage?
          </ThemedText>
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
          style={{ alignSelf: "stretch" }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default CreateStorageForm;
