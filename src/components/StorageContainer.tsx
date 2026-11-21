import Badge from "@/components/Basic/Badge";
import Button from "@/components/Basic/Button";
import ThemedText from "@/components/Basic/ThemedText";
import { rarityColors } from "@/constants/rarity";
import { useTheme } from "@/stores/ThemeContext";
import { itemsTable, Storage } from "@/db/schema";
import React from "react";
import { FlatList, View } from "react-native";
import { useDatabase } from "@/db/DatabaseProvider";
import { eq } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import ItemComponent from "./ItemComponent";
import { router } from "expo-router";

interface StorageContainerProps {
  storage: Storage;
}

const StorageContainer: React.FC<StorageContainerProps> = ({ storage }) => {
  const theme = useTheme();
  const db = useDatabase();
  const items = useLiveQuery(
    db.query.itemsTable.findMany({
      where: eq(itemsTable.storage_location_id, storage.storage_location_id),
    }),
    [storage.storage_location_id],
  );

  const itemListHeader = (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
      }}
    >
      <View style={{ flex: 7 }}>
        <ThemedText variant="subhead">Name</ThemedText>
      </View>
      <View
        style={{
          flexDirection: "row",
          flex: 3,
          gap: theme.spacing.md,
          justifyContent: "flex-end",
        }}
      >
        <ThemedText variant="subhead">Qty</ThemedText>
        <ThemedText variant="subhead">Weight</ThemedText>
      </View>
    </View>
  );

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        boxShadow: theme.shadows.card,
        borderRadius: theme.radius.lg,
        borderCurve: "continuous",
        padding: theme.spacing.md,
      }}
      testID={`container-card-${storage.storage_location_id}`}
    >
      <View>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            gap: theme.spacing.sm,
          }}
        >
          <ThemedText variant="headline">{storage.name} </ThemedText>
          <View
            style={{
              flexDirection: "row",
              gap: theme.spacing.sm,
              alignItems: "center",
              flexShrink: 1,
            }}
          >
            <Badge text={storage.rarity} color={rarityColors[storage.rarity]} />
            <Button
              title="AddItem"
              onPress={() => {
                router.push({
                  pathname: "/CreateItemForm",
                  params: {
                    storageId: storage.storage_location_id,
                  },
                });
              }}
              size="sm"
              testID={`add-item-button-${storage.storage_location_id}`}
            />
          </View>
        </View>
        <View
          style={{
            flexDirection: "row",
            gap: theme.spacing.sm,
            borderBottomWidth: 1,
            borderColor: theme.colors.border,
            marginBottom: theme.spacing.sm,
          }}
        >
          <ThemedText variant="subhead">
            Storing: {storage.weight}lbs
          </ThemedText>
        </View>
      </View>
      <FlatList
        data={items.data.slice(0, 5)}
        ListHeaderComponent={itemListHeader}
        renderItem={({ item }) => <ItemComponent item={item} />}
        keyExtractor={(item) => item.item_id.toString()}
        showsVerticalScrollIndicator={true}
        ListEmptyComponent={
          <ThemedText variant="subhead">No items</ThemedText>
        }
      />
    </View>
  );
};

export default StorageContainer;
