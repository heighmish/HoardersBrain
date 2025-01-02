import Badge from "@/components/Basic/Badge";
import NumericInput from "@/components/Basic/NumericInput";
import { RarityArray } from "@/constants/databaseTypes";
import { Colours, defaultStyles, Spacing } from "@/constants/Styles";
import { useDatabase } from "@/db/DatabaseProvider";
import { Storage, storageLocationsTable } from "@/db/schema";
import { useCharacterContext } from "@/stores/CharacterContext";
import AntDesign from "@expo/vector-icons/build/AntDesign";
import { router } from "expo-router";
import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  TouchableOpacity,
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

  const submit = async () => {
    if (storageInput.name === "") {
      return;
    }

    console.log(
      `[CreateStorageForm]: Creating new container with ${JSON.stringify(storageInput)}...`,
    );
    await db.insert(storageLocationsTable).values(storageInput);
    router.back();
  };
  return (
    <View style={[defaultStyles.container, { gap: Spacing.s }]}>
      <TextInput
        style={defaultStyles.textInputSmall}
        placeholder="Name"
        value={storageInput.name}
        onChangeText={(text) =>
          setStorageInput((prev) => ({ ...prev, name: text }))
        }
      />
      <TextInput
        style={defaultStyles.textInputSmall}
        placeholder="Description"
        value={storageInput.description ?? ""}
        onChangeText={(text) =>
          setStorageInput((prev) => ({ ...prev, description: text }))
        }
      />

      <View style={[defaultStyles.flexRow, { overflowX: "" }]}>
        {RarityArray.map((rarity) => (
          <Pressable
            onPressIn={() =>
              setStorageInput((prev) => ({
                ...prev,
                rarity: rarity,
              }))
            }
            key={`create-storage-rarity-${rarity}`}
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
        value={storageInput.weight.toFixed(0)}
        onChangeText={(text) =>
          setStorageInput((prev) => ({
            ...prev,
            weight: text === "" ? 0 : Math.max(0, parseInt(text)),
          }))
        }
        buttonDecrement={() =>
          setStorageInput((prev) => ({
            ...prev,
            weight: Math.max(0, prev.weight - 1),
          }))
        }
        buttonIncrement={() =>
          setStorageInput((prev) => ({
            ...prev,
            weight: prev.weight + 1,
          }))
        }
      />

      <Pressable
        style={[defaultStyles.flexRow, { gap: Spacing.m }]}
        onPressIn={() =>
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
          name={storageInput.is_fixed_weight ? "checksquare" : "checksquareo"}
          size={20}
        />
      </Pressable>

      <Pressable
        style={[defaultStyles.flexRow, { gap: Spacing.m }]}
        onPressIn={() =>
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
          name={storageInput.carrying ? "checksquare" : "checksquareo"}
          size={20}
        />
      </Pressable>

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

export default CreateStorageForm;
