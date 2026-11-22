import AppHeader from "@/components/Basic/AppHeader";
import Badge from "@/components/Basic/Badge";
import Button from "@/components/Basic/Button";
import ScreenState from "@/components/Basic/ScreenState";
import ThemedText from "@/components/Basic/ThemedText";
import { rarityColors } from "@/constants/rarity";
import { useDatabase } from "@/db/DatabaseProvider";
import {
  deleteItemRow,
  removeOneFromStack,
} from "@/db/repositories/items";
import { Item } from "@/db/schema";
import { useActiveItem } from "@/hooks/useActiveItem";
import { useActiveStorage } from "@/hooks/useActiveStorage";
import { useCharacterRow } from "@/hooks/useCharacterRow";
import { useTheme } from "@/stores/ThemeContext";
import { parseIdParam } from "@/utils/params";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";

const ItemDetail = () => {
  const { itemId } = useLocalSearchParams<{ itemId?: string }>();
  const parsedItemId = parseIdParam(itemId);

  if (parsedItemId === null) {
    return (
      <ScreenState
        kind="message"
        message="Item not found"
        actionLabel="Back"
        onAction={() => router.back()}
        actionTestID="item-not-found-back"
      />
    );
  }

  return <ItemDetailContent itemId={parsedItemId} />;
};

const ItemDetailContent = ({ itemId }: { itemId: number }) => {
  const item = useActiveItem(itemId);

  if (item.error) {
    return <ScreenState kind="message" message="Failed to load item" />;
  }

  if (item.updatedAt === undefined) {
    return <ScreenState kind="loading" />;
  }

  if (item.data === undefined) {
    return (
      <ScreenState
        kind="message"
        message="Item not found"
        actionLabel="Back"
        onAction={() => router.back()}
        actionTestID="item-not-found-back"
      />
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
  const storage = useActiveStorage(item.storage_location_id);
  const character = useCharacterRow(item.character_id);
  const [submitting, setSubmitting] = useState(false);
  const showWeight = character.data?.weight_tracking !== false;

  const handleRemoveOne = async () => {
    if (submitting) {
      return;
    }
    setSubmitting(true);
    try {
      await removeOneFromStack(db, item.item_id);
    } catch (error) {
      console.error("Failed to remove item", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveAll = async () => {
    if (submitting) {
      return;
    }
    setSubmitting(true);
    try {
      await deleteItemRow(db, item.item_id);
      router.back();
    } catch (error) {
      console.error("Failed to delete item", error);
    } finally {
      setSubmitting(false);
    }
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
              loading={submitting}
              disabled={submitting}
              fullWidth
            />
            <Button
              title="Remove All"
              testID="remove-all-button"
              variant="secondary"
              onPress={handleRemoveAll}
              loading={submitting}
              disabled={submitting}
              fullWidth
            />
          </View>
        ) : (
          <Button
            title="Delete Item"
            testID="delete-item-button"
            variant="secondary"
            onPress={handleRemoveAll}
            loading={submitting}
            disabled={submitting}
            fullWidth
          />
        )}
      </ScrollView>
    </View>
  );
};

export default ItemDetail;
