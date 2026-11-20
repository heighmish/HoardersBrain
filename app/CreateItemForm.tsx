import Badge from "@/components/Basic/Badge";
import NumericInput from "@/components/Basic/NumericInput";
import { RarityArray } from "@/constants/databaseTypes";
import { Colours, defaultStyles, Spacing } from "@/constants/Styles";
import { useDatabase } from "@/db/DatabaseProvider";
import { Item, itemsTable } from "@/db/schema";
import { useCharacterContext } from "@/stores/CharacterContext";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

type ItemInput = Omit<Item, "item_id">;

const CreateItemForm = () => {
  const db = useDatabase();
  const character = useCharacterContext();
  const { storageId } = useLocalSearchParams<{
    storageId: string;
  }>();

  const [itemInput, setItemInput] = useState<ItemInput>({
    name: "",
    description: null,
    rarity: "Common",
    character_id: character.character.id,
    properties: null,
    weight: 1,
    quantity: 1,
    item_type: "consumable",
    storage_location_id: Number(storageId),
  });

  // Raw text so decimals like "1.5" survive typing; parsed on submit.
  const [weightText, setWeightText] = useState("1");

  const adjustWeight = (delta: number) => {
    setWeightText(String(Math.max(0, (parseFloat(weightText) || 0) + delta)));
  };

  const submit = async () => {
    if (itemInput.name === "") {
      return;
    }

    await db.insert(itemsTable).values({
      ...itemInput,
      weight: Math.max(0, parseFloat(weightText) || 0),
    });
    router.back();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: Spacing.m, gap: Spacing.s }}
      >
        <TextInput
          style={defaultStyles.textInputSmall}
          placeholder="Name"
          value={itemInput.name}
          testID="item-name-input"
          onChangeText={(text) =>
            setItemInput((prev) => ({ ...prev, name: text }))
          }
        />
        <TextInput
          style={defaultStyles.textInputSmall}
          placeholder="Description"
          value={itemInput.description ?? ""}
          testID="item-description-input"
          onChangeText={(text) =>
            setItemInput((prev) => ({ ...prev, description: text }))
          }
        />

        <View style={defaultStyles.flexRow}>
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
                colour={rarity}
                filled={itemInput.rarity === rarity}
              />
            </Pressable>
          ))}
        </View>

        <Text style={defaultStyles.inputLabel}>Weight?</Text>
        <NumericInput
          value={weightText}
          testID="item-weight-input"
          onChangeText={setWeightText}
          buttonDecrement={() => adjustWeight(-0.5)}
          buttonIncrement={() => adjustWeight(0.5)}
        />

        <Pressable
          accessibilityRole="button"
          testID="create-item-button"
          onPress={submit}
          style={({ pressed }) => [
            defaultStyles.pillButtonSmall,
            { backgroundColor: Colours.primary },
            pressed && { opacity: 0.6 },
          ]}
        >
          <Text>Create</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default CreateItemForm;
