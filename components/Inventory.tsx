import React from "react";
import { Button, FlatList, StyleSheet, Text, View } from "react-native";
import { Character, storageLocationsTable } from "../db/schema";
import { useDatabase } from "@/db/DatabaseProvider";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { eq } from "drizzle-orm";
import StorageContainer from "./StorageContainer";

interface InventoryProps {
  character: Character;
}

const Inventory: React.FC<InventoryProps> = ({ character }) => {
  const db = useDatabase();
  const { data } = useLiveQuery(
    db
      .select()
      .from(storageLocationsTable)
      .where(eq(storageLocationsTable.character_id, character.character_id)),
  );

  return (
    <View style={styles.container}>
      <Text>{character.name}</Text>
      <View style={styles.currency}>
        <Text>Copper: {character.copper}</Text>
        <Text>Silver: {character.silver}</Text>
        <Text>Gold: {character.gold}</Text>
        <Text>Platinum: {character.platinum}</Text>
      </View>
      <FlatList
        data={data}
        renderItem={({ item }) => <StorageContainer storage={item} />}
        keyExtractor={(item) => item.storage_location_id.toString()}
      />
      <Button
        title="Add Container"
        onPress={async () => {
          await db.insert(storageLocationsTable).values({
            character_id: character.character_id,
            name: "Backpack",
            rarity: "common",
            weight: 5,
          });
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { display: "flex", flexDirection: "column", gap: 16 },
  currency: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

export default Inventory;
