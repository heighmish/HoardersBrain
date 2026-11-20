import Badge from "@/components/Basic/Badge";
import { moveItemToContainer } from "@/components/itemOperations";
import { rarityColors } from "@/constants/rarity";
import { useDatabase } from "@/db/DatabaseProvider";
import { Item, itemsTable, storageLocationsTable } from "@/db/schema";
import { useTheme } from "@/stores/ThemeContext";
import { and, eq, ne } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

const parseIdParam = (raw: string | undefined): number | null => {
  if (raw === undefined) {
    return null;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
};

const MoveItemPicker = () => {
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
        <Text style={theme.type.body}>Item not found</Text>
      </View>
    );
  }

  return <MoveItemPickerContent itemId={parsedItemId} />;
};

const MoveItemPickerContent = ({ itemId }: { itemId: number }) => {
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
          flex: 1,
          backgroundColor: theme.colors.background,
          padding: theme.spacing.md,
        }}
      >
        <Text style={theme.type.body}>Failed to load item</Text>
      </View>
    );
  }

  if (item.updatedAt === undefined) {
    return <View style={{ flex: 1, backgroundColor: theme.colors.background }} />;
  }

  if (item.data === undefined) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.colors.background,
          padding: theme.spacing.md,
        }}
      >
        <Text style={theme.type.body}>Item not found</Text>
      </View>
    );
  }

  return <MoveItemPickerBody item={item.data} />;
};

const MoveItemPickerBody = ({ item }: { item: Item }) => {
  const theme = useTheme();
  const db = useDatabase();
  const containers = useLiveQuery(
    db.query.storageLocationsTable.findMany({
      where: and(
        eq(storageLocationsTable.character_id, item.character_id),
        ne(storageLocationsTable.storage_location_id, item.storage_location_id),
      ),
    }),
    [item.character_id, item.storage_location_id],
  );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        padding: theme.spacing.md,
        gap: theme.spacing.md,
      }}
      testID="move-picker-screen"
    >
      <Stack.Screen options={{ headerTitle: "Move item" }} />
      <Text style={theme.type.headline}>{item.name}</Text>
      {containers.data.length === 0 ? (
        <Text style={theme.type.body}>No other containers</Text>
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
              onPress={async () => {
                await moveItemToContainer(
                  db,
                  item.item_id,
                  container.storage_location_id,
                );
                router.back();
              }}
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
              <Text style={theme.type.body}>{container.name}</Text>
              <Badge
                text={container.rarity}
                color={rarityColors[container.rarity]}
              />
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

export default MoveItemPicker;
