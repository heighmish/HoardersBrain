import Badge from "@/components/Basic/Badge";
import NumericInput from "@/components/Basic/NumericInput";
import { RarityArray } from "@/constants/databaseTypes";
import { Colours, defaultStyles, Spacing } from "@/constants/Styles";
import { useDatabase } from "@/db/DatabaseProvider";
import { Storage, storageLocationsTable } from "@/db/schema";
import { useCharacterContext } from "@/stores/CharacterContext";
import { AntDesign } from "@expo/vector-icons";
import { router } from "expo-router";
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

type StorageInput = Omit<Storage, "storage_location_id">;

const CreateStorageForm = () => {
  const db = useDatabase();
  const character = useCharacterContext();

  const [storageInput, setStorageInput] = useState<StorageInput>({
    name: "",
    description: null,
    carrying: true,
    rarity: "Common",
    character_id: character.character.id,
    is_fixed_weight: false,
    properties: null,
    weight: 0,
  });

  // Raw text so decimals like "1.5" survive typing; parsed on submit.
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
          value={storageInput.name}
          testID="storage-name-input"
          onChangeText={(text) =>
            setStorageInput((prev) => ({ ...prev, name: text }))
          }
        />
        <TextInput
          style={defaultStyles.textInputSmall}
          placeholder="Description"
          value={storageInput.description ?? ""}
          testID="storage-description-input"
          onChangeText={(text) =>
            setStorageInput((prev) => ({ ...prev, description: text }))
          }
        />

        <View style={defaultStyles.flexRow}>
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
                colour={rarity}
                filled={storageInput.rarity === rarity}
              />
            </Pressable>
          ))}
        </View>

        <Text style={defaultStyles.inputLabel}>Weight?</Text>
        <NumericInput
          value={weightText}
          testID="storage-weight-input"
          onChangeText={setWeightText}
          buttonDecrement={() => adjustWeight(-0.5)}
          buttonIncrement={() => adjustWeight(0.5)}
        />

        <Pressable
          style={({ pressed }) => [
            defaultStyles.flexRow,
            { gap: Spacing.m },
            pressed && { opacity: 0.6 },
          ]}
          accessibilityRole="switch"
          accessibilityState={{ checked: storageInput.is_fixed_weight ?? false }}
          testID="fixed-weight-toggle"
          onPress={() =>
            setStorageInput((prev) => ({
              ...prev,
              is_fixed_weight: !prev.is_fixed_weight,
            }))
          }
        >
          <Text style={defaultStyles.inputLabel}>
            Does the storage have a fixed weight?
          </Text>
          <AntDesign
            name={storageInput.is_fixed_weight ? "check-square" : "border"}
            size={20}
          />
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            defaultStyles.flexRow,
            { gap: Spacing.m },
            pressed && { opacity: 0.6 },
          ]}
          accessibilityRole="switch"
          accessibilityState={{ checked: storageInput.carrying ?? false }}
          testID="carrying-toggle"
          onPress={() =>
            setStorageInput((prev) => ({
              ...prev,
              carrying: !prev.carrying,
            }))
          }
        >
          <Text style={defaultStyles.inputLabel}>
            Are you carrying the storage?
          </Text>
          <AntDesign
            name={storageInput.carrying ? "check-square" : "border"}
            size={20}
          />
        </Pressable>

        <Pressable
          accessibilityRole="button"
          testID="create-storage-button"
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

export default CreateStorageForm;
