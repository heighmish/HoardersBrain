import Button from "@/components/Basic/Button";
import { splitItemStack } from "@/components/itemOperations";
import { useDatabase } from "@/db/DatabaseProvider";
import { Item, itemsTable, storageLocationsTable } from "@/db/schema";
import { useTheme } from "@/stores/ThemeContext";
import { and, eq, ne } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
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
        <Text style={theme.type.body}>Item not found</Text>
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
      <Stack.Screen options={{ headerTitle: "Split stack" }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: theme.spacing.md,
          gap: theme.spacing.md,
        }}
      >
        <View style={{ gap: theme.spacing.xs }}>
          <Text style={theme.type.headline}>{item.name}</Text>
          <Text
            style={[theme.type.body, { fontVariant: ["tabular-nums"] }]}
          >
            Quantity: {item.quantity}
          </Text>
        </View>
        {maxAmount < 1 ? (
          <Text style={theme.type.body}>Cannot split a stack of 1</Text>
        ) : (
          <>
            <View style={{ gap: theme.spacing.xs }}>
              <Text style={theme.type.headline}>Amount?</Text>
              <Text style={theme.type.subhead}>Choose 1 to {maxAmount}</Text>
              <TextInput
                style={{
                  backgroundColor: theme.colors.surface,
                  color: theme.colors.text,
                  borderColor: theme.colors.border,
                  borderWidth: 1,
                  borderRadius: theme.radius.md,
                  borderCurve: "continuous",
                  paddingVertical: theme.spacing.sm,
                  paddingHorizontal: theme.spacing.md,
                  fontSize: 17,
                }}
                keyboardType="number-pad"
                placeholderTextColor={theme.colors.textMuted}
                value={amountText}
                testID="split-amount-input"
                onChangeText={setAmountText}
              />
            </View>
            <View style={{ gap: theme.spacing.sm }}>
              <Text style={theme.type.headline}>Destination</Text>
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
                  <Text style={theme.type.body}>{container.name}</Text>
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
