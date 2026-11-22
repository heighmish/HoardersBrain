import AppHeader from "@/components/Basic/AppHeader";
import ScreenState from "@/components/Basic/ScreenState";
import ThemedText from "@/components/Basic/ThemedText";
import { useDatabase } from "@/db/DatabaseProvider";
import { transferItemToCharacter } from "@/db/repositories/items";
import { charactersTable, Item } from "@/db/schema";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { useItem } from "@/hooks/useItem";
import { useTheme } from "@/stores/ThemeContext";
import { parseIdParam } from "@/utils/params";
import { and, isNull, ne } from "drizzle-orm";
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

const TransferItemPicker = () => {
  const theme = useTheme();
  const { itemId } = useLocalSearchParams<{ itemId?: string }>();
  const parsedItemId = parseIdParam(itemId);

  return (
    <View
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      testID="transfer-picker-screen"
    >
      <AppHeader title="Transfer item" />
      {parsedItemId === null ? (
        <ScreenState
          kind="message"
          message="Item not found"
          actionLabel="Back"
          onAction={goBack}
        />
      ) : (
        <TransferItemPickerContent itemId={parsedItemId} />
      )}
    </View>
  );
};

const TransferItemPickerContent = ({ itemId }: { itemId: number }) => {
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

  return <TransferItemPickerBody item={item.data} />;
};

const TransferItemPickerBody = ({ item }: { item: Item }) => {
  const theme = useTheme();
  const db = useDatabase();
  const action = useAsyncAction({ keepBusyOnSuccess: true });
  const characters = useLiveQuery(
    db.query.charactersTable.findMany({
      where: and(
        ne(charactersTable.character_id, item.character_id),
        isNull(charactersTable.deleted_at),
      ),
    }),
    [item.character_id],
  );

  const transferToCharacter = (targetCharacterId: number) => {
    void action.run(async () => {
      await transferItemToCharacter(db, item.item_id, targetCharacterId);
      router.dismiss(2);
    }, "Failed to transfer item.");
  };

  return (
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
              accessibilityState={{ disabled: action.submitting }}
              disabled={action.submitting}
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
      {action.error !== null ? (
        <ThemedText variant="caption" style={{ color: theme.colors.error }}>
          {action.error}
        </ThemedText>
      ) : null}
    </View>
  );
};

export default TransferItemPicker;
