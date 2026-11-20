import { itemsTable, Storage } from "@/db/schema";
import React from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useDatabase } from "@/db/DatabaseProvider";
import { eq } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import ItemComponent from "./ItemComponent";
import { Colours, defaultStyles, Spacing } from "@/constants/Styles";
import Badge from "./Basic/Badge";
import { router } from "expo-router";

interface StorageContainerProps {
  storage: Storage;
}

const ItemListHeader = () => {
  return (
    <View
      style={[
        defaultStyles.flexRow,
        {
          justifyContent: "space-between",
        },
      ]}
    >
      <View style={{ flex: 7 }}>
        <Text>Name</Text>
      </View>
      <View style={[defaultStyles.flexRow, { flex: 3, gap: Spacing.m }]}>
        <Text>Qty</Text>
        <Text>Weight</Text>
      </View>
    </View>
  );
};

const StorageContainer: React.FC<StorageContainerProps> = ({ storage }) => {
  const db = useDatabase();
  const items = useLiveQuery(
    db.query.itemsTable.findMany({
      where: eq(itemsTable.storage_location_id, storage.storage_location_id),
    }),
    [storage.storage_location_id],
  );

  return (
    <View
      style={defaultStyles.card}
      testID={`container-card-${storage.storage_location_id}`}
    >
      <View>
        <View
          style={[defaultStyles.flexRow, { justifyContent: "space-between" }]}
        >
          <Text style={defaultStyles.heading1}>{storage.name} </Text>
          <View style={[defaultStyles.flexRow, { gap: Spacing.s }]}>
            <Badge text={storage.rarity} colour={storage.rarity} />
            <Pressable
              accessibilityRole="button"
              testID={`add-item-button-${storage.storage_location_id}`}
              onPress={() => {
                router.push({
                  pathname: "/CreateItemForm",
                  params: {
                    storageId: storage.storage_location_id,
                  },
                });
              }}
              style={({ pressed }) => [
                defaultStyles.pillButtonSmall,
                { backgroundColor: Colours.primary },
                pressed && { opacity: 0.6 },
              ]}
            >
              <Text style={defaultStyles.buttonText}>AddItem</Text>
            </Pressable>
          </View>
        </View>
        <View
          style={[
            defaultStyles.flexRow,
            {
              gap: Spacing.s,
              borderBottomWidth: 1,
              borderColor: Colours.lightGray,
              marginBottom: Spacing.s,
            },
          ]}
        >
          <Text>Storing: {storage.weight}lbs</Text>
        </View>
      </View>
      <FlatList
        data={items.data.slice(0, 5)}
        ListHeaderComponent={<ItemListHeader />}
        renderItem={({ item }) => <ItemComponent item={item} />}
        keyExtractor={(item) => item.item_id.toString()}
        showsVerticalScrollIndicator={true}
      />
    </View>
  );
};

export default StorageContainer;
