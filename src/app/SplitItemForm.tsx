import AppHeader from "@/components/Basic/AppHeader";
import Button from "@/components/Basic/Button";
import Input from "@/components/Basic/Input";
import ThemedText from "@/components/Basic/ThemedText";
import { splitItemStack } from "@/components/itemOperations";
import { useDatabase } from "@/db/DatabaseProvider";
import { Item, itemsTable, storageLocationsTable } from "@/db/schema";
import { useTheme } from "@/stores/ThemeContext";
import { and, eq, ne } from "drizzle-orm";
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

const parseIdParam = (raw: string | undefined): number | null => {
  if (raw === undefined) {
    return null;
  }
  const parsed = Number.parseInt(raw, 10);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
};

const SplitItemForm = () => {
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

  return <SplitItemFormContent itemId={parsedItemId} />;
};

const SplitItemFormContent = ({ itemId }: { itemId: number }) => {
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

  return <SplitItemFormBody item={item.data} />;
};

const SplitItemFormBody = ({ item }: { item: Item }) => {
  const theme = useTheme();
  const db = useDatabase();
  const [amountText, setAmountText] = useState("1");
  const [destinationId, setDestinationId] = useState<number | null>(null);

  const containers = useLiveQuery(
    db.query.storageLocationsTable.findMany({
      where: and(
        eq(storageLocationsTable.character_id, item.character_id),
        ne(storageLocationsTable.storage_location_id, item.storage_location_id),
      ),
    }),
    [item.character_id, item.storage_location_id],
  );

  const maxAmount = item.quantity - 1;
  const amount = Number.parseInt(amountText, 10);
  const amountValid =
    Number.isInteger(amount) && amount >= 1 && amount <= maxAmount;

  const split = async () => {
    if (!amountValid || destinationId === null) {
      return;
    }
    await splitItemStack(db, item.item_id, amount, destinationId);
    router.back();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1, backgroundColor: theme.colors.background }}
    >
      <AppHeader title="Split stack" />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: theme.spacing.md,
          gap: theme.spacing.md,
        }}
      >
        <View style={{ gap: theme.spacing.xs }}>
          <ThemedText variant="headline">{item.name}</ThemedText>
          <ThemedText variant="body" style={{ fontVariant: ["tabular-nums"] }}>
            Quantity: {item.quantity}
          </ThemedText>
        </View>
        {maxAmount < 1 ? (
          <ThemedText variant="body">Cannot split a stack of 1</ThemedText>
        ) : (
          <>
            <View style={{ gap: theme.spacing.xs }}>
              <ThemedText variant="headline">Amount?</ThemedText>
              <ThemedText variant="subhead">Choose 1 to {maxAmount}</ThemedText>
              <Input
                keyboardType="number-pad"
                value={amountText}
                testID="split-amount-input"
                onChangeText={setAmountText}
              />
            </View>
            <View style={{ gap: theme.spacing.sm }}>
              <ThemedText variant="headline">Destination</ThemedText>
              {containers.data.map((container) => (
                <Pressable
                  key={container.storage_location_id}
                  accessibilityRole="button"
                  accessibilityState={{
                    selected: destinationId === container.storage_location_id,
                  }}
                  onPress={() => {
                    setDestinationId(container.storage_location_id);
                  }}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                    borderColor:
                      destinationId === container.storage_location_id
                        ? theme.colors.accent
                        : theme.colors.border,
                    borderWidth: 1,
                    borderRadius: theme.radius.md,
                    padding: theme.spacing.sm,
                    backgroundColor: theme.colors.surface,
                  })}
                  testID={`split-destination-${container.storage_location_id}`}
                >
                  <ThemedText variant="body">{container.name}</ThemedText>
                </Pressable>
              ))}
            </View>
            <Button
              title="Split"
              testID="confirm-split-button"
              onPress={split}
              disabled={!amountValid || destinationId === null}
              fullWidth
            />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default SplitItemForm;
