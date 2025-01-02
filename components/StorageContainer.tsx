import { itemsTable, Storage } from "@/db/schema";
import React from "react";
import { Button, FlatList, Text, View } from "react-native";
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

const StorageContainer: React.FC<StorageContainerProps> = ({ storage }) => {
  const db = useDatabase();
  const items = useLiveQuery(
    db.query.itemsTable.findMany({
      where: eq(itemsTable.storage_location_id, storage.storage_location_id),
    }),
  );

  return (
    <View style={defaultStyles.card}>
      <View>
        <View
          style={[defaultStyles.flexRow, { justifyContent: "space-between" }]}
        >
          <Text style={defaultStyles.heading1}>{storage.name} </Text>
          <View style={[defaultStyles.flexRow, { gap: Spacing.s }]}>
            <Badge text={storage.rarity} colour={storage.rarity} />
            <Button
              title={"AddItem"}
              onPress={() => {
                router.setParams({ storageId: storage.storage_location_id });
                router.push("/CreateItemForm");
              }}
            />
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
        data={items.data}
        ListHeaderComponent={
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
        }
        renderItem={({ item }) => <ItemComponent item={item} />}
        keyExtractor={(item) => item.item_id.toString()}
      />
    </View>
  );
};

export default StorageContainer;
