import Badge from "@/components/Basic/Badge";
import NumericInput from "@/components/Basic/NumericInput";
import { RarityArray } from "@/constants/databaseTypes";
import { Colours, defaultStyles, Spacing } from "@/constants/Styles";
import { useDatabase } from "@/db/DatabaseProvider";
import { Item, itemsTable } from "@/db/schema";
import { useCharacterContext } from "@/stores/CharacterContext";
import { router } from "expo-router";
import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  TouchableOpacity,
} from "react-native";

type ItemInput = Omit<Item, "item_id">;

const CreateItemForm = () => {
  const db = useDatabase();
  const character = useCharacterContext();

  const [itemInput, setItemInput] = useState<ItemInput>({
    name: "",
    description: null,
    rarity: "Common",
    character_id: character.character.id,
    properties: null,
    weight: 1,
    quantity: 1,
    item_type: "consumable",
    storage_location_id: 0, // Read from somewhere
  });

  const submit = async () => {
    if (itemInput.name === "") {
      return;
    }

    console.log(
      `[CreateItemForm]: Creating new item with ${JSON.stringify(itemInput)}...`,
    );
    await db
      .insert(itemsTable)
      .values({ ...itemInput, storage_location_id: 1 });
    router.back();
  };
  return (
    <View style={[defaultStyles.container, { gap: Spacing.s }]}>
      <TextInput
        style={defaultStyles.textInputSmall}
        placeholder="Name"
        value={itemInput.name}
        onChangeText={(text) =>
          setItemInput((prev) => ({ ...prev, name: text }))
        }
      />
      <TextInput
        style={defaultStyles.textInputSmall}
        placeholder="Description"
        value={itemInput.description ?? ""}
        onChangeText={(text) =>
          setItemInput((prev) => ({ ...prev, description: text }))
        }
      />

      <View style={[defaultStyles.flexRow, { overflowX: "" }]}>
        {RarityArray.map((rarity) => (
          <Pressable
            onPressIn={() =>
              setItemInput((prev) => ({
                ...prev,
                rarity: rarity,
              }))
            }
            key={`create-storage-rarity-${rarity}`}
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
        value={itemInput.weight.toFixed(0)}
        onChangeText={(text) =>
          setItemInput((prev) => ({
            ...prev,
            weight: text === "" ? 0 : Math.max(0, parseInt(text)),
          }))
        }
        buttonDecrement={() =>
          setItemInput((prev) => ({
            ...prev,
            weight: Math.max(0, prev.weight - 1),
          }))
        }
        buttonIncrement={() =>
          setItemInput((prev) => ({
            ...prev,
            weight: prev.weight + 1,
          }))
        }
      />

      <TouchableOpacity
        onPressIn={submit}
        style={[
          defaultStyles.pillButtonSmall,
          { backgroundColor: Colours.primary },
        ]}
      >
        <Text>Create</Text>
      </TouchableOpacity>
    </View>
  );
};

export default CreateItemForm;
