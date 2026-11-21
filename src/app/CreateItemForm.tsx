import Badge from "@/components/Basic/Badge";
import Button from "@/components/Basic/Button";
import Input from "@/components/Basic/Input";
import NumericInput from "@/components/Basic/NumericInput";
import { rarityColors } from "@/constants/rarity";
import { RarityArray } from "@/constants/databaseTypes";
import { useDatabase } from "@/db/DatabaseProvider";
import { useTheme } from "@/stores/ThemeContext";
import { Item, itemsTable } from "@/db/schema";
import { useSelectedCharacter } from "@/stores/CharacterContext";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

type ItemInput = Omit<Item, "item_id" | "storage_location_id" | "weight">;

const parseStorageId = (raw: string | undefined): number | null => {
  if (raw === undefined) {
    return null;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
};

const CreateItemForm = () => {
  const theme = useTheme();
  const db = useDatabase();
  const character = useSelectedCharacter();
  const { storageId } = useLocalSearchParams<{ storageId?: string }>();

  const [itemInput, setItemInput] = useState<ItemInput>({
    name: "",
    description: null,
    rarity: "Common",
    character_id: character.id,
    properties: null,
    quantity: 1,
    item_type: "consumable",
  });

  const [weightText, setWeightText] = useState("1");

  const adjustWeight = (delta: number) => {
    setWeightText(String(Math.max(0, (parseFloat(weightText) || 0) + delta)));
  };

  const storageLocationId = parseStorageId(storageId);

  if (storageLocationId === null) {
    return (
      <View
        style={{
          padding: theme.spacing.md,
          backgroundColor: theme.colors.background,
          flex: 1,
        }}
      >
        <Text style={theme.type.body}>
          No storage container selected - go back and pick one first.
        </Text>
      </View>
    );
  }

  const submit = async () => {
    if (itemInput.name === "") {
      return;
    }

    await db.insert(itemsTable).values({
      ...itemInput,
      storage_location_id: storageLocationId,
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
          value={itemInput.name}
          testID="item-name-input"
          onChangeText={(text) =>
            setItemInput((prev) => ({ ...prev, name: text }))
          }
        />
        <Input
          placeholder="Description"
          value={itemInput.description ?? ""}
          testID="item-description-input"
          onChangeText={(text) =>
            setItemInput((prev) => ({ ...prev, description: text }))
          }
        />

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: theme.spacing.xs }}>
          {RarityArray.map((rarity) => (
            <Pressable
              onPress={() =>
                setItemInput((prev) => ({
                  ...prev,
                  rarity: rarity,
                }))
              }
              key={`create-item-rarity-${rarity}`}
              accessibilityRole="button"
              accessibilityState={{ selected: itemInput.rarity === rarity }}
              testID={`item-rarity-${rarity}`}
            >
              <Badge
                text={rarity}
                color={rarityColors[rarity]}
                filled={itemInput.rarity === rarity}
              />
            </Pressable>
          ))}
        </View>

        <Text style={theme.type.headline}>Weight?</Text>
        <NumericInput
          value={weightText}
          testID="item-weight-input"
          onChangeText={setWeightText}
          buttonDecrement={() => adjustWeight(-0.5)}
          buttonIncrement={() => adjustWeight(0.5)}
        />

        <Button
          title="Create"
          onPress={submit}
          testID="create-item-button"
          style={{ alignSelf: "stretch" }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default CreateItemForm;
