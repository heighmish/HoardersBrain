import ThemedText from "@/components/Basic/ThemedText";
import { transferItemToCharacter } from "@/components/itemOperations";
import { useDatabase } from "@/db/DatabaseProvider";
import { charactersTable, Item, itemsTable } from "@/db/schema";
import { useTheme } from "@/stores/ThemeContext";
import { eq, ne } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, View } from "react-native";

const parseIdParam = (raw: string | undefined): number | null => {
  if (raw === undefined) {
    return null;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
};

const TransferItemPicker = () => {
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

  return <TransferItemPickerContent itemId={parsedItemId} />;
};

const TransferItemPickerContent = ({ itemId }: { itemId: number }) => {
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
        <ThemedText variant="body">Failed to load item</ThemedText>
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
        <ThemedText variant="body">Item not found</ThemedText>
      </View>
    );
  }

  return <TransferItemPickerBody item={item.data} />;
};

const TransferItemPickerBody = ({ item }: { item: Item }) => {
  const theme = useTheme();
  const db = useDatabase();
  const characters = useLiveQuery(
    db.query.charactersTable.findMany({
      where: ne(charactersTable.character_id, item.character_id),
    }),
    [item.character_id],
  );

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.colors.background,
        padding: theme.spacing.md,
        gap: theme.spacing.md,
      }}
      testID="transfer-picker-screen"
    >
      <Stack.Screen options={{ headerTitle: "Transfer item" }} />
      <ThemedText variant="headline">{item.name}</ThemedText>
      {characters.data.length === 0 ? (
        <ThemedText variant="body">No other characters</ThemedText>
      ) : (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={{ gap: theme.spacing.sm }}
        >
          {characters.data.map((character) => (
            <Pressable
              key={character.character_id}
              accessibilityRole="button"
              accessibilityLabel={character.name}
              onPress={async () => {
                await transferItemToCharacter(
                  db,
                  item.item_id,
                  character.character_id,
                );
                router.dismiss(2);
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
              testID={`transfer-target-${character.character_id}`}
            >
              <ThemedText variant="body">{character.name}</ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

export default TransferItemPicker;
