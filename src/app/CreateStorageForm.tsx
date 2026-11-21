import Badge from "@/components/Basic/Badge";
import Button from "@/components/Basic/Button";
import Input from "@/components/Basic/Input";
import NumericInput from "@/components/Basic/NumericInput";
import ThemedText from "@/components/Basic/ThemedText";
import { rarityColors } from "@/constants/rarity";
import { RarityArray } from "@/constants/databaseTypes";
import { useDatabase } from "@/db/DatabaseProvider";
import { useTheme } from "@/stores/ThemeContext";
import { Storage, storageLocationsTable } from "@/db/schema";
import { useSelectedCharacter } from "@/stores/CharacterContext";
import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  View,
} from "react-native";

type StorageInput = Omit<Storage, "storage_location_id" | "weight">;

const CreateStorageForm = () => {
  const theme = useTheme();
  const db = useDatabase();
  const character = useSelectedCharacter();

  const [storageInput, setStorageInput] = useState<StorageInput>({
    name: "",
    description: null,
    carrying: true,
    rarity: "Common",
    character_id: character.id,
    is_fixed_weight: false,
    properties: null,
  });

  const [weightText, setWeightText] = useState("0");

  const adjustWeight = (delta: number) => {
    setWeightText(String(Math.max(0, (parseFloat(weightText) || 0) + delta)));
  };

  const submit = async () => {
    if (storageInput.name === "") {
      return;
    }

    await db.insert(storageLocationsTable).values({
      ...storageInput,
      weight: Math.max(0, parseFloat(weightText) || 0),
    });
    router.back();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: theme.colors.background }}
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

        <ThemedText variant="headline">Weight?</ThemedText>
        <NumericInput
          value={weightText}
          testID="storage-weight-input"
          onChangeText={setWeightText}
          buttonDecrement={() => adjustWeight(-0.5)}
          buttonIncrement={() => adjustWeight(0.5)}
        />

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
          title="Create"
          onPress={submit}
          testID="create-storage-button"
          style={{ alignSelf: "stretch" }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default CreateStorageForm;
