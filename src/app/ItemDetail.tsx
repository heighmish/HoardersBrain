import AppHeader from "@/components/Basic/AppHeader";
import Badge from "@/components/Basic/Badge";
import Button from "@/components/Basic/Button";
import ThemedText from "@/components/Basic/ThemedText";
import {
  deleteItemRow,
  removeOneFromStack,
} from "@/components/itemOperations";
import { rarityColors } from "@/constants/rarity";
import { useDatabase } from "@/db/DatabaseProvider";
import { Item, itemsTable, storageLocationsTable, charactersTable } from "@/db/schema";
import { useTheme } from "@/stores/ThemeContext";
import { and, eq, isNull } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, View } from "react-native";

const parseIdParam = (raw: string | undefined): number | null => {
  if (raw === undefined) {
    return null;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
};

const ItemDetail = () => {
  const theme = useTheme();
  const { itemId } = useLocalSearchParams<{ itemId?: string }>();
  const parsedItemId = parseIdParam(itemId);

  if (parsedItemId === null) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          padding: theme.spacing.md,
        }}
      >
        <ThemedText variant="body">Item not found</ThemedText>
      </View>
    );
  }

  return <ItemDetailContent itemId={parsedItemId} />;
};

const ItemDetailContent = ({ itemId }: { itemId: number }) => {
  const theme = useTheme();
  const db = useDatabase();
  const item = useLiveQuery(
    db.query.itemsTable.findFirst({
      where: and(eq(itemsTable.item_id, itemId), isNull(itemsTable.deleted_at)),
    }),
    [itemId],
  );

  if (item.error) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          padding: theme.spacing.md,
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
          flex: 1,
          backgroundColor: theme.colors.background,
          padding: theme.spacing.md,
          gap: theme.spacing.md,
        }}
      >
        <ThemedText variant="body">Item not found</ThemedText>
        <Button
          title="Back"
          variant="secondary"
          onPress={() => {
            router.back();
          }}
          testID="item-not-found-back"
        />
      </View>
    );
  }

  return <ItemDetailBody item={item.data} />;
};

const statRow = {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
} as const;

const ItemDetailBody = ({ item }: { item: Item }) => {
  const theme = useTheme();
  const db = useDatabase();
  const storage = useLiveQuery(
    db.query.storageLocationsTable.findFirst({
      where: and(
        eq(
          storageLocationsTable.storage_location_id,
          item.storage_location_id,
        ),
        isNull(storageLocationsTable.deleted_at),
      ),
    }),
    [item.storage_location_id],
  );
  const character = useLiveQuery(
    db.query.charactersTable.findFirst({
      where: eq(charactersTable.character_id, item.character_id),
      columns: { weight_tracking: true },
    }),
    [item.character_id],
  );
  const showWeight = character.data?.weight_tracking !== false;

  const handleRemoveOne = async () => {
    await removeOneFromStack(db, item.item_id);
  };

  const handleRemoveAll = async () => {
    await deleteItemRow(db, item.item_id);
    router.back();
  };

  return (
    <View
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      testID="item-detail-screen"
    >
      <AppHeader title="Item detail" />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          padding: theme.spacing.md,
          gap: theme.spacing.md,
        }}
      >
        <View style={{ gap: theme.spacing.sm }}>
          <ThemedText variant="title">{item.name}</ThemedText>
          <Badge text={item.rarity} color={rarityColors[item.rarity]} />
        </View>
        <View
          style={{
            backgroundColor: theme.colors.surface,
            boxShadow: theme.shadows.card,
            borderRadius: theme.radius.lg,
            borderCurve: "continuous",
            padding: theme.spacing.md,
            gap: theme.spacing.sm,
          }}
        >
          <View style={statRow}>
            <ThemedText variant="subhead">Quantity</ThemedText>
            <ThemedText variant="body" style={{ fontVariant: ["tabular-nums"] }}>
              {item.quantity}
            </ThemedText>
          </View>
          {showWeight ? (
            <View style={statRow}>
              <ThemedText variant="subhead">Weight</ThemedText>
              <ThemedText variant="body" style={{ fontVariant: ["tabular-nums"] }}>
                {item.weight}
              </ThemedText>
            </View>
          ) : null}
          <View style={statRow}>
            <ThemedText variant="subhead">Type</ThemedText>
            <ThemedText variant="body">{item.item_type}</ThemedText>
          </View>
          {storage.data === undefined ? null : (
            <View style={statRow}>
              <ThemedText variant="subhead">Container</ThemedText>
              <ThemedText variant="body">{storage.data.name}</ThemedText>
            </View>
          )}
          <View style={statRow}>
            <ThemedText variant="subhead">Description</ThemedText>
            <ThemedText variant="body">{item.description ?? "None"}</ThemedText>
          </View>
        </View>
        <View style={{ gap: theme.spacing.sm }}>
          <Button
            title="Edit Item"
            testID="edit-item-button"
            onPress={() => {
              router.push({
                pathname: "/CreateItemForm",
                params: { itemId: item.item_id },
              });
            }}
            fullWidth
          />
          {item.quantity > 1 ? (
            <Button
              title="Split Stack"
              testID="split-item-button"
              variant="secondary"
              onPress={() => {
                router.push({
                  pathname: "/SplitItemForm",
                  params: { itemId: item.item_id },
                });
              }}
              fullWidth
            />
          ) : null}
          <Button
            title="Move Item"
            testID="move-item-button"
            variant="secondary"
            onPress={() => {
              router.push({
                pathname: "/MoveItemPicker",
                params: { itemId: item.item_id },
              });
            }}
            fullWidth
          />
          <Button
            title="Transfer Item"
            testID="transfer-item-button"
            variant="secondary"
            onPress={() => {
              router.push({
                pathname: "/TransferItemPicker",
                params: { itemId: item.item_id },
              });
            }}
            fullWidth
          />
        </View>
        {item.quantity > 1 ? (
          <View style={{ gap: theme.spacing.sm }}>
            <Button
              title="Remove One"
              testID="remove-one-button"
              variant="secondary"
              onPress={handleRemoveOne}
              fullWidth
            />
            <Button
              title="Remove All"
              testID="remove-all-button"
              variant="secondary"
              onPress={handleRemoveAll}
              fullWidth
            />
          </View>
        ) : (
          <Button
            title="Delete Item"
            testID="delete-item-button"
            variant="secondary"
            onPress={handleRemoveAll}
            fullWidth
          />
        )}
      </ScrollView>
    </View>
  );
};

export default ItemDetail;
