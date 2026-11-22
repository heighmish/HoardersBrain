import AppHeader from "@/components/Basic/AppHeader";
import Button from "@/components/Basic/Button";
import Input from "@/components/Basic/Input";
import ScreenState from "@/components/Basic/ScreenState";
import ThemedText from "@/components/Basic/ThemedText";
import { useDatabase } from "@/db/DatabaseProvider";
import { splitItemStack } from "@/db/repositories/items";
import { Item, storageLocationsTable } from "@/db/schema";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { useItem } from "@/hooks/useItem";
import { useTheme } from "@/stores/ThemeContext";
import { parseIdParam } from "@/utils/params";
import { and, eq, isNull, ne } from "drizzle-orm";
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

const goBack = () => {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace("/(tabs)");
};

const SplitItemForm = () => {
  const theme = useTheme();
  const { itemId } = useLocalSearchParams<{ itemId?: string }>();
  const parsedItemId = parseIdParam(itemId);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <AppHeader title="Split stack" />
      {parsedItemId === null ? (
        <ScreenState
          kind="message"
          message="Item not found"
          actionLabel="Back"
          onAction={goBack}
        />
      ) : (
        <SplitItemFormContent itemId={parsedItemId} />
      )}
    </View>
  );
};

const SplitItemFormContent = ({ itemId }: { itemId: number }) => {
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

  return <SplitItemFormBody item={item.data} />;
};

const SplitItemFormBody = ({ item }: { item: Item }) => {
  const theme = useTheme();
  const db = useDatabase();
  const [amountText, setAmountText] = useState("1");
  const [destinationId, setDestinationId] = useState<number | null>(null);
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

  const maxAmount = item.quantity - 1;
  const amount = Number.parseInt(amountText, 10);
  const amountValid =
    Number.isInteger(amount) && amount >= 1 && amount <= maxAmount;

  const split = () => {
    if (!amountValid || destinationId === null) {
      return;
    }

    void action.run(async () => {
      await splitItemStack(db, item.item_id, amount, destinationId);
      router.back();
    }, "Failed to split stack.");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
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
                    disabled: action.submitting,
                  }}
                  disabled={action.submitting}
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
              loading={action.submitting}
              disabled={
                action.submitting || !amountValid || destinationId === null
              }
              fullWidth
            />
            {action.error !== null ? (
              <ThemedText
                variant="caption"
                style={{ color: theme.colors.error }}
              >
                {action.error}
              </ThemedText>
            ) : null}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default SplitItemForm;
