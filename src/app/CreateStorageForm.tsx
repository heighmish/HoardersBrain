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
        title={editingId === null ? "New container" : "Edit container"}
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
    const trimmedName = storageInput.name.trim();
    if (trimmedName.length === 0) {
      return;
    }

    const values = {
      ...storageInput,
      name: trimmedName,
      weight: Math.max(0, parseFloat(weightText) || 0),
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
    }, "Failed to save container.");
  };

  const sectionLabel = (label: string) => (
    <ThemedText
      variant="caption"
      style={{
        textTransform: "uppercase",
        letterSpacing: 0.5,
      }}
    >
      {label}
    </ThemedText>
  );

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
          gap: theme.spacing.md,
        }}
      >
        <View style={{ gap: theme.spacing.xs }}>
          {sectionLabel("Name")}
          <Input
            placeholder="Name"
            value={storageInput.name}
            testID="storage-name-input"
            onChangeText={(text) =>
              setStorageInput((prev) => ({ ...prev, name: text }))
            }
          />
        </View>

        <View style={{ gap: theme.spacing.xs }}>
          {sectionLabel("Weight")}
          <NumericInput
            value={weightText}
            testID="storage-weight-input"
            onChangeText={setWeightText}
            buttonDecrement={() => adjustWeight(-0.5)}
            buttonIncrement={() => adjustWeight(0.5)}
          />
        </View>

        <View
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            borderWidth: 1,
            borderRadius: theme.radius.md,
            borderCurve: "continuous",
            overflow: "hidden",
          }}
        >
          <Pressable
            style={({ pressed }) => ({
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              gap: theme.spacing.md,
              padding: theme.spacing.md,
              opacity: pressed ? 0.7 : 1,
            })}
            accessibilityRole="switch"
            accessibilityState={{ checked: storageInput.carrying }}
            onPress={() =>
              setStorageInput((prev) => ({
                ...prev,
                carrying: !prev.carrying,
              }))
            }
          >
            <View style={{ flex: 1, gap: theme.spacing.xs }}>
              <ThemedText variant="body">Carrying</ThemedText>
              <ThemedText variant="caption">
                Counts toward encumbrance
              </ThemedText>
            </View>
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

          <View
            style={{
              height: 1,
              backgroundColor: theme.colors.border,
            }}
          />

          <Pressable
            style={({ pressed }) => ({
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              gap: theme.spacing.md,
              padding: theme.spacing.md,
              opacity: pressed ? 0.7 : 1,
            })}
            accessibilityRole="switch"
            accessibilityState={{ checked: storageInput.is_fixed_weight }}
            onPress={() =>
              setStorageInput((prev) => ({
                ...prev,
                is_fixed_weight: !prev.is_fixed_weight,
              }))
            }
          >
            <View style={{ flex: 1, gap: theme.spacing.xs }}>
              <ThemedText variant="body">Fixed weight</ThemedText>
              <ThemedText variant="caption">
                Ignores contents (e.g. Bag of Holding)
              </ThemedText>
            </View>
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
        </View>

        <View style={{ gap: theme.spacing.xs }}>
          {sectionLabel("Rarity")}
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
        </View>

        <View style={{ gap: theme.spacing.xs }}>
          {sectionLabel("Description")}
          <Input
            placeholder="Description"
            value={storageInput.description ?? ""}
            testID="storage-description-input"
            onChangeText={(text) =>
              setStorageInput((prev) => ({ ...prev, description: text }))
            }
          />
        </View>

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
          disabled={submitting || storageInput.name.trim().length === 0}
          fullWidth
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default CreateStorageForm;
