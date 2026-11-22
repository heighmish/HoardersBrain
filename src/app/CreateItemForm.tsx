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
import { createItem, updateItemDetails } from "@/db/repositories/items";
import { Item, storageLocationsTable } from "@/db/schema";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { useCharacter } from "@/hooks/useCharacter";
import { useItem } from "@/hooks/useItem";
import { useSelectedCharacter } from "@/stores/CharacterContext";
import { useTheme } from "@/stores/ThemeContext";
import { parseIdParam } from "@/utils/params";
import { and, eq, isNull } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";

type ItemInput = Omit<
  Item,
  "item_id" | "storage_location_id" | "weight" | "deleted_at"
>;

const goBack = () => {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace("/(tabs)");
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

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AppHeader title={editItemId !== null ? "Edit item" : "Create new item"} />
      {editItemId !== null ? (
        <EditItemFormLoader itemId={editItemId} />
      ) : (
        <ItemFormBody
          mode="create"
          storageId={createStorageId ?? undefined}
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
      )}
    </View>
  );
};

const EditItemFormLoader = ({ itemId }: { itemId: number }) => {
  const item = useItem(itemId);

  if (item.status === "error") {
    return (
      <ScreenState
        kind="message"
        message="Failed to load item"
        actionLabel="Back"
        onAction={goBack}
      />
    );
  }

  if (item.status === "loading") {
    return <ScreenState kind="loading" />;
  }

  if (item.status === "missing") {
    return (
      <ScreenState
        kind="message"
        message="Item not found"
        actionLabel="Back"
        onAction={goBack}
      />
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
  | { mode: "create"; storageId?: number }
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
  const [selectedContainerId, setSelectedContainerId] = useState<number | null>(
    props.mode === "create" && props.storageId !== undefined
      ? props.storageId
      : null,
  );
  const action = useAsyncAction({ keepBusyOnSuccess: true });

  const character = useCharacter(initialInput.character_id);
  const showWeight =
    character.status !== "ready" ||
    character.data.weight_tracking !== false;

  const containers = useLiveQuery(
    db.query.storageLocationsTable.findMany({
      where: and(
        eq(storageLocationsTable.character_id, initialInput.character_id),
        isNull(storageLocationsTable.deleted_at),
      ),
    }),
    [initialInput.character_id],
  );
  const containerList = containers.data ?? [];

  const defaultContainerId =
    mode === "create" && selectedContainerId === null
      ? (containerList.find((entry) => entry.carrying) ?? containerList[0])
          ?.storage_location_id ?? null
      : null;
  const containerId = selectedContainerId ?? defaultContainerId;

  const adjustWeight = (delta: number) => {
    setWeightText(String(Math.max(0, (parseFloat(weightText) || 0) + delta)));
  };

  const submit = () => {
    if (itemInput.name === "") {
      return;
    }

    if (props.mode === "create" && containerId === null) {
      return;
    }

    const quantity = Math.max(1, Number.parseInt(quantityText, 10) || 1);
    const weight = showWeight
      ? Math.max(0, parseFloat(weightText) || 0)
      : mode === "create"
        ? 0
        : Math.max(0, parseFloat(initialWeightText) || 0);

    void action.run(async () => {
      if (props.mode === "create") {
        if (containerId === null) {
          return;
        }
        await createItem(db, {
          ...itemInput,
          quantity,
          storage_location_id: containerId,
          weight,
        });
      } else {
        await updateItemDetails(db, props.itemId, {
          name: itemInput.name,
          description: itemInput.description,
          item_type: itemInput.item_type,
          weight,
          rarity: itemInput.rarity,
          quantity,
          properties: itemInput.properties,
        });
      }
      router.back();
    }, "Failed to save item.");
  };

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
              style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
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

        {props.mode === "create" ? (
          <View style={{ gap: theme.spacing.xs }}>
            <ThemedText variant="subhead">Container</ThemedText>
            {containerList.length === 0 ? (
              <ThemedText variant="subhead">No containers</ThemedText>
            ) : (
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: theme.spacing.xs,
                }}
              >
                {containerList.map((container) => (
                  <Pressable
                    onPress={() => setSelectedContainerId(container.storage_location_id)}
                    key={`item-container-${container.storage_location_id}`}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected: containerId === container.storage_location_id,
                    }}
                    style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                    testID={`item-container-${container.storage_location_id}`}
                  >
                    <Badge
                      text={container.name}
                      color={
                        containerId === container.storage_location_id
                          ? theme.colors.accent
                          : theme.colors.border
                      }
                      filled={containerId === container.storage_location_id}
                    />
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        ) : null}

        <ThemedText variant="headline">Quantity?</ThemedText>
        <Input
          keyboardType="number-pad"
          value={quantityText}
          testID="item-quantity-input"
          onChangeText={setQuantityText}
        />

        {showWeight ? (
          <>
            <ThemedText variant="headline">Weight?</ThemedText>
            <NumericInput
              value={weightText}
              testID="item-weight-input"
              onChangeText={setWeightText}
              buttonDecrement={() => adjustWeight(-0.5)}
              buttonIncrement={() => adjustWeight(0.5)}
            />
          </>
        ) : null}

        <Button
          title={mode === "edit" ? "Save" : "Create"}
          onPress={submit}
          loading={action.submitting}
          disabled={
            action.submitting || (mode === "create" && containerId === null)
          }
          testID={mode === "edit" ? "save-item-button" : "create-item-button"}
          fullWidth
        />
        {action.error !== null ? (
          <ThemedText variant="caption" style={{ color: theme.colors.error }}>
            {action.error}
          </ThemedText>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default CreateItemForm;
