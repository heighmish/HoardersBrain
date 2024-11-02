import React from "react";
import { Button, FlatList, StyleSheet, Text, View } from "react-native";
import { charactersTable, storageLocationsTable } from "../db/schema";
import { useDatabase } from "../db/DatabaseProvider";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { eq } from "drizzle-orm";
import StorageContainer from "./StorageContainer";

interface InventoryProps {
  characterId: number;
}

const Inventory: React.FC<InventoryProps> = ({ characterId }) => {
  const db = useDatabase();
  const character = useLiveQuery(
    db.query.charactersTable.findFirst({
      where: eq(charactersTable.character_id, characterId),
    }),
  );

  const storageLocations = useLiveQuery(
    db
      .select()
      .from(storageLocationsTable)
      .where(eq(storageLocationsTable.character_id, characterId)),
  );

  if (!character.data || character.error) {
    return (
      <View>
        <Text>Failed to load character information</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text>{character.data.name}</Text>
      <View style={styles.currency}>
        <Text>Copper: {character.data.copper}</Text>
        <Text>Silver: {character.data.silver}</Text>
        <Text>Gold: {character.data.gold}</Text>
        <Text>Platinum: {character.data.platinum}</Text>
      </View>
      <FlatList
        data={storageLocations.data}
        renderItem={({ item }) => <StorageContainer storage={item} />}
        keyExtractor={(item) => item.storage_location_id.toString()}
      />
      <Button
        title="Add Container"
        onPress={async () => {
          await db.insert(storageLocationsTable).values({
            character_id: characterId,
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
