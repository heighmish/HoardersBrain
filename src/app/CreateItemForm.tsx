import Badge from "@/components/Basic/Badge";
import Button from "@/components/Basic/Button";
import Input from "@/components/Basic/Input";
import NumericInput from "@/components/Basic/NumericInput";
import ThemedText from "@/components/Basic/ThemedText";
import { updateItemDetails } from "@/components/itemOperations";
import { rarityColors } from "@/constants/rarity";
import { RarityArray } from "@/constants/databaseTypes";
import { useDatabase } from "@/db/DatabaseProvider";
import { useTheme } from "@/stores/ThemeContext";
import { Item, itemsTable } from "@/db/schema";
import { useSelectedCharacter } from "@/stores/CharacterContext";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { eq } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";

type ItemInput = Omit<Item, "item_id" | "storage_location_id" | "weight">;

const parseIdParam = (raw: string | undefined): number | null => {
  if (raw === undefined) {
    return null;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
};

const CreateItemForm = () => {
  const theme = useTheme();
  const character = useSelectedCharacter();
  const { storageId, itemId } = useLocalSearchParams<{
    storageId?: string;
    itemId?: string;
  }>();

  const editItemId = parseIdParam(itemId);
  const createStorageId = parseIdParam(storageId);

  if (editItemId !== null) {
    return <EditItemFormLoader itemId={editItemId} />;
  }

  if (createStorageId === null) {
    return (
      <View
        style={{
          padding: theme.spacing.md,
          backgroundColor: theme.colors.background,
          flex: 1,
        }}
      >
        <ThemedText variant="body">
          No storage container selected - go back and pick one first.
        </ThemedText>
      </View>
    );
  }

  return (
    <ItemFormBody
      mode="create"
      storageId={createStorageId}
      initialInput={{
        name: "",
        description: null,
        rarity: "Common",
        character_id: character.id,
        properties: null,
        quantity: 1,
        item_type: "consumable",
      }}
      initialWeightText="1"
      initialQuantityText="1"
    />
  );
};

const EditItemFormLoader = ({ itemId }: { itemId: number }) => {
  const theme = useTheme();
  const db = useDatabase();
  const item = useLiveQuery(
    db.query.itemsTable.findFirst({
      where: eq(itemsTable.item_id, itemId),
    }),
    [itemId],
  );

  if (item.error) {
    return (
      <View
        style={{
          padding: theme.spacing.md,
          backgroundColor: theme.colors.background,
          flex: 1,
        }}
      >
        <ThemedText variant="body">Failed to load item</ThemedText>
      </View>
    );
  }

  if (item.updatedAt === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.background }} />
    );
  }

  if (item.data === undefined) {
    return (
      <View
        style={{
          padding: theme.spacing.md,
          backgroundColor: theme.colors.background,
          flex: 1,
        }}
      >
        <ThemedText variant="body">Item not found</ThemedText>
      </View>
    );
  }

  const loaded = item.data;

  return (
    <ItemFormBody
      key={loaded.item_id}
      mode="edit"
      itemId={loaded.item_id}
      initialInput={{
        name: loaded.name,
        description: loaded.description,
        rarity: loaded.rarity,
        character_id: loaded.character_id,
        properties: loaded.properties,
        quantity: loaded.quantity,
        item_type: loaded.item_type,
      }}
      initialWeightText={String(loaded.weight)}
      initialQuantityText={String(loaded.quantity)}
    />
  );
};

type ItemFormBodyProps = (
  | { mode: "create"; storageId: number }
  | { mode: "edit"; itemId: number }
) & {
  initialInput: ItemInput;
  initialWeightText: string;
  initialQuantityText: string;
};

const ItemFormBody = (props: ItemFormBodyProps) => {
  const theme = useTheme();
  const db = useDatabase();

  const { mode, initialInput, initialWeightText, initialQuantityText } =
    props;

  const [itemInput, setItemInput] = useState<ItemInput>(initialInput);
  const [weightText, setWeightText] = useState(initialWeightText);
  const [quantityText, setQuantityText] = useState(initialQuantityText);

  const adjustWeight = (delta: number) => {
    setWeightText(String(Math.max(0, (parseFloat(weightText) || 0) + delta)));
  };

  const submit = async () => {
    if (itemInput.name === "") {
      return;
    }

    const quantity = Math.max(1, Number.parseInt(quantityText, 10) || 1);

    if (props.mode === "create") {
      await db.insert(itemsTable).values({
        ...itemInput,
        quantity,
        storage_location_id: props.storageId,
        weight: Math.max(0, parseFloat(weightText) || 0),
      });
    } else {
      await updateItemDetails(db, props.itemId, {
        name: itemInput.name,
        description: itemInput.description,
        item_type: itemInput.item_type,
        weight: Math.max(0, parseFloat(weightText) || 0),
        rarity: itemInput.rarity,
        quantity,
        properties: itemInput.properties,
      });
    }
    router.back();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: theme.colors.background }}
    >
      <Stack.Screen
        options={{ headerTitle: mode === "edit" ? "Edit item" : "Create new item" }}
      />
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

        <ThemedText variant="headline">Quantity?</ThemedText>
        <Input
          keyboardType="number-pad"
          value={quantityText}
          testID="item-quantity-input"
          onChangeText={setQuantityText}
        />

        <ThemedText variant="headline">Weight?</ThemedText>
        <NumericInput
          value={weightText}
          testID="item-weight-input"
          onChangeText={setWeightText}
          buttonDecrement={() => adjustWeight(-0.5)}
          buttonIncrement={() => adjustWeight(0.5)}
        />

        <Button
          title={mode === "edit" ? "Save" : "Create"}
          onPress={submit}
          testID={mode === "edit" ? "save-item-button" : "create-item-button"}
          fullWidth
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default CreateItemForm;
