import { itemsTable, Storage } from "@/db/schema";
import React from "react";
import { Button, FlatList, StyleSheet, Text, View } from "react-native";
import { useDatabase } from "@/db/DatabaseProvider";
import { eq } from "drizzle-orm";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import ItemComponent from "./ItemComponent";

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
    <View style={styles.card}>
      <View style={styles.header}>
        <Text>{storage.name} </Text>
        <View style={{ display: "flex", flexDirection: "row" }}>
          <Text>{storage.weight} </Text>
          <Text>{storage.rarity} </Text>
          <Button
            title={"AddItem"}
            onPress={async () => {
              await db.insert(itemsTable).values({
                name: "Giant slayer",
                weight: 5,
                description: "WOW",
                rarity: "Common",
                quantity: 1,
                item_type: "weapon",
                character_id: storage.character_id,
                storage_location_id: storage.storage_location_id,
              });
            }}
          />
        </View>
      </View>
      <FlatList
        data={items.data}
        renderItem={({ item }) => <ItemComponent item={item} />}
        keyExtractor={(item) => item.item_id.toString()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderRadius: 10,
    padding: 8,
  },
  header: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

export default StorageContainer;
