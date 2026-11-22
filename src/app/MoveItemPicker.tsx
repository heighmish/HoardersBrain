import AppHeader from "@/components/Basic/AppHeader";
import Badge from "@/components/Basic/Badge";
import ScreenState from "@/components/Basic/ScreenState";
import ThemedText from "@/components/Basic/ThemedText";
import { rarityColors } from "@/constants/rarity";
import { useDatabase } from "@/db/DatabaseProvider";
import { moveItemToContainer } from "@/db/repositories/items";
import { Item, storageLocationsTable } from "@/db/schema";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { useItem } from "@/hooks/useItem";
import { useTheme } from "@/stores/ThemeContext";
import { parseIdParam } from "@/utils/params";
import { and, eq, isNull, ne } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";

const goBack = () => {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace("/(tabs)");
};

const MoveItemPicker = () => {
  const theme = useTheme();
  const { itemId } = useLocalSearchParams<{ itemId?: string }>();
  const parsedItemId = parseIdParam(itemId);

  return (
    <View
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      testID="move-picker-screen"
    >
      <AppHeader title="Move item" />
      {parsedItemId === null ? (
        <ScreenState
          kind="message"
          message="Item not found"
          actionLabel="Back"
          onAction={goBack}
        />
      ) : (
        <MoveItemPickerContent itemId={parsedItemId} />
      )}
    </View>
  );
};

const MoveItemPickerContent = ({ itemId }: { itemId: number }) => {
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

  return <MoveItemPickerBody item={item.data} />;
};

const MoveItemPickerBody = ({ item }: { item: Item }) => {
  const theme = useTheme();
  const db = useDatabase();
  const action = useAsyncAction({ keepBusyOnSuccess: true });
  const containers = useLiveQuery(
    db.query.storageLocationsTable.findMany({
      where: and(
        eq(storageLocationsTable.character_id, item.character_id),
        ne(storageLocationsTable.storage_location_id, item.storage_location_id),
        isNull(storageLocationsTable.deleted_at),
      ),
    }),
    [item.character_id, item.storage_location_id],
  );

  const moveToContainer = (destinationStorageId: number) => {
    void action.run(async () => {
      await moveItemToContainer(db, item.item_id, destinationStorageId);
      router.back();
    }, "Failed to move item.");
  };

  return (
    <View
      style={{
        padding: theme.spacing.md,
        gap: theme.spacing.md,
      }}
    >
      <ThemedText variant="headline">{item.name}</ThemedText>
      {containers.data.length === 0 ? (
        <ThemedText variant="body">No other containers</ThemedText>
      ) : (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ gap: theme.spacing.sm }}
        >
          {containers.data.map((container) => (
            <Pressable
              key={container.storage_location_id}
              accessibilityRole="button"
              accessibilityLabel={container.name}
              accessibilityState={{ disabled: action.submitting }}
              disabled={action.submitting}
              onPress={() => moveToContainer(container.storage_location_id)}
              style={({ pressed }) => ({
                opacity: pressed ? 0.7 : 1,
                backgroundColor: theme.colors.surface,
                boxShadow: theme.shadows.card,
                borderRadius: theme.radius.lg,
                borderCurve: "continuous",
                padding: theme.spacing.sm,
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              })}
              testID={`move-destination-${container.storage_location_id}`}
            >
              <ThemedText variant="body">{container.name}</ThemedText>
              <Badge
                text={container.rarity}
                color={rarityColors[container.rarity]}
              />
            </Pressable>
          ))}
        </ScrollView>
      )}
      {action.error !== null ? (
        <ThemedText variant="caption" style={{ color: theme.colors.error }}>
          {action.error}
        </ThemedText>
      ) : null}
    </View>
  );
};

export default MoveItemPicker;
