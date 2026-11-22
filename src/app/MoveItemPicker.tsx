import AppHeader from "@/components/Basic/AppHeader";
import Badge from "@/components/Basic/Badge";
import ScreenState from "@/components/Basic/ScreenState";
import ThemedText from "@/components/Basic/ThemedText";
import { rarityColors } from "@/constants/rarity";
import { useDatabase } from "@/db/DatabaseProvider";
import { moveItemToContainer } from "@/db/repositories/items";
import { Item, storageLocationsTable } from "@/db/schema";
import { useActiveItem } from "@/hooks/useActiveItem";
import { useTheme } from "@/stores/ThemeContext";
import { parseIdParam } from "@/utils/params";
import { and, eq, isNull, ne } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

const MoveItemPicker = () => {
  const { itemId } = useLocalSearchParams<{ itemId?: string }>();
  const parsedItemId = parseIdParam(itemId);

  if (parsedItemId === null) {
    return <ScreenState kind="message" message="Item not found" />;
  }

  return <MoveItemPickerContent itemId={parsedItemId} />;
};

const MoveItemPickerContent = ({ itemId }: { itemId: number }) => {
  const item = useActiveItem(itemId);

  if (item.error) {
    return <ScreenState kind="message" message="Failed to load item" />;
  }

  if (item.updatedAt === undefined) {
    return <ScreenState kind="loading" />;
  }

  if (item.data === undefined) {
    return <ScreenState kind="message" message="Item not found" />;
  }

  return <MoveItemPickerBody item={item.data} />;
};

const MoveItemPickerBody = ({ item }: { item: Item }) => {
  const theme = useTheme();
  const db = useDatabase();
  const [submitting, setSubmitting] = useState(false);
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

  const moveToContainer = async (destinationStorageId: number) => {
    if (submitting) {
      return;
    }
    setSubmitting(true);
    try {
      await moveItemToContainer(db, item.item_id, destinationStorageId);
      router.back();
    } catch (error) {
      console.error("Failed to move item", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      testID="move-picker-screen"
    >
      <AppHeader title="Move item" />
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
              accessibilityState={{ disabled: submitting }}
              disabled={submitting}
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
      </View>
    </View>
  );
};

export default MoveItemPicker;
