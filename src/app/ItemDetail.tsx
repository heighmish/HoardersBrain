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
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { useCharacter } from "@/hooks/useCharacter";
import { useContainer } from "@/hooks/useContainer";
import { useItem } from "@/hooks/useItem";
import { useTheme } from "@/stores/ThemeContext";
import { parseIdParam } from "@/utils/params";
import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, View } from "react-native";

const goBack = () => {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace("/(tabs)");
};

const ItemDetail = () => {
  const theme = useTheme();
  const { itemId } = useLocalSearchParams<{ itemId?: string }>();
  const parsedItemId = parseIdParam(itemId);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AppHeader title="Item detail" />
      {parsedItemId === null ? (
        <ScreenState
          kind="message"
          message="Item not found"
          actionLabel="Back"
          onAction={goBack}
          actionTestID="item-not-found-back"
        />
      ) : (
        <ItemDetailContent itemId={parsedItemId} />
      )}
    </View>
  );
};

const ItemDetailContent = ({ itemId }: { itemId: number }) => {
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
  const storage = useContainer(item.storage_location_id);
  const character = useCharacter(item.character_id);
  const removeOneAction = useAsyncAction();
  const deleteAction = useAsyncAction({ keepBusyOnSuccess: true });
  const busy = removeOneAction.submitting || deleteAction.submitting;
  const showWeight =
    character.status !== "ready" ||
    character.data.weight_tracking !== false;

  const handleRemoveOne = () => {
    if (busy) {
      return;
    }
    void removeOneAction.run(async () => {
      await removeOneFromStack(db, item.item_id);
    }, "Failed to delete item.");
  };

  const handleRemoveAll = () => {
    if (busy) {
      return;
    }
    void deleteAction.run(async () => {
      await deleteItemRow(db, item.item_id);
      router.back();
    }, "Failed to delete item.");
  };

  return (
    <ScrollView
      testID="item-detail-screen"
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
        {storage.status === "ready" ? (
          <View style={statRow}>
            <ThemedText variant="subhead">Container</ThemedText>
            <ThemedText variant="body">{storage.data.name}</ThemedText>
          </View>
        ) : null}
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
            loading={removeOneAction.submitting}
            disabled={busy}
            fullWidth
          />
          <Button
            title="Remove All"
            testID="remove-all-button"
            variant="secondary"
            onPress={handleRemoveAll}
            loading={deleteAction.submitting}
            disabled={busy}
            fullWidth
          />
        </View>
      ) : (
        <Button
          title="Delete Item"
          testID="delete-item-button"
          variant="secondary"
          onPress={handleRemoveAll}
          loading={deleteAction.submitting}
          disabled={deleteAction.submitting}
          fullWidth
        />
      )}
      {removeOneAction.error !== null ? (
        <ThemedText variant="caption" style={{ color: theme.colors.error }}>
          {removeOneAction.error}
        </ThemedText>
      ) : null}
      {deleteAction.error !== null ? (
        <ThemedText variant="caption" style={{ color: theme.colors.error }}>
          {deleteAction.error}
        </ThemedText>
      ) : null}
    </ScrollView>
  );
};

export default ItemDetail;
