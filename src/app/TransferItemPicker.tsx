import AppHeader from "@/components/Basic/AppHeader";
import ScreenState from "@/components/Basic/ScreenState";
import ThemedText from "@/components/Basic/ThemedText";
import { useDatabase } from "@/db/DatabaseProvider";
import { transferItemToCharacter } from "@/db/repositories/items";
import { charactersTable, Item } from "@/db/schema";
import { useActiveItem } from "@/hooks/useActiveItem";
import { useTheme } from "@/stores/ThemeContext";
import { parseIdParam } from "@/utils/params";
import { and, isNull, ne } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

const TransferItemPicker = () => {
  const { itemId } = useLocalSearchParams<{ itemId?: string }>();
  const parsedItemId = parseIdParam(itemId);

  if (parsedItemId === null) {
    return <ScreenState kind="message" message="Item not found" />;
  }

  return <TransferItemPickerContent itemId={parsedItemId} />;
};

const TransferItemPickerContent = ({ itemId }: { itemId: number }) => {
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

  return <TransferItemPickerBody item={item.data} />;
};

const TransferItemPickerBody = ({ item }: { item: Item }) => {
  const theme = useTheme();
  const db = useDatabase();
  const [submitting, setSubmitting] = useState(false);
  const characters = useLiveQuery(
    db.query.charactersTable.findMany({
      where: and(
        ne(charactersTable.character_id, item.character_id),
        isNull(charactersTable.deleted_at),
      ),
    }),
    [item.character_id],
  );

  const transferToCharacter = async (targetCharacterId: number) => {
    if (submitting) {
      return;
    }
    setSubmitting(true);
    try {
      await transferItemToCharacter(db, item.item_id, targetCharacterId);
      router.dismiss(2);
    } catch (error) {
      console.error("Failed to transfer item", error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      testID="transfer-picker-screen"
    >
      <AppHeader title="Transfer item" />
      <View
        style={{
          padding: theme.spacing.md,
          gap: theme.spacing.md,
        }}
      >
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
              accessibilityState={{ disabled: submitting }}
              disabled={submitting}
              onPress={() => transferToCharacter(character.character_id)}
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
    </View>
  );
};

export default TransferItemPicker;
