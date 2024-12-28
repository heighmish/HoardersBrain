import React from "react";
import { Button, FlatList, StyleSheet, Text, View } from "react-native";
import { charactersTable, storageLocationsTable } from "@/db/schema";
import { useDatabase } from "@/db/DatabaseProvider";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { eq } from "drizzle-orm";
import StorageContainer from "@/components/StorageContainer";
import { Href, Link, router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LAST_CHARACTER_ID } from "@/constants/CacheKeys";
import AntDesign from "@expo/vector-icons/build/AntDesign";
import { Spacing } from "@/constants/Styles";
import {
  DEFAULT_CHARACTER,
  useCharacterContext,
} from "@/stores/CharacterContext";

const Inventory = () => {
  const characterContext = useCharacterContext();
  const db = useDatabase();

  const character = useLiveQuery(
    db.query.charactersTable.findFirst({
      where: eq(charactersTable.character_id, characterContext.character.id),
    }),
    [characterContext.character],
  );

  const storageLocations = useLiveQuery(
    db
      .select()
      .from(storageLocationsTable)
      .where(
        eq(storageLocationsTable.character_id, characterContext.character.id),
      ),
    [characterContext.character],
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
      <StatusBar style="dark" />
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Link
              href="/changeCharacterSheet"
              style={{ paddingLeft: Spacing.s }}
            >
              <Text>{character.data!.name.slice(0, 25)} </Text>
              <AntDesign name="down" size={12} color="black" />
            </Link>
          ),
          headerTitle: () => <></>,
          headerRight: () => (
            <View style={{ paddingRight: Spacing.s }}>
              <Button
                title="logout"
                onPress={async () => {
                  await AsyncStorage.removeItem(LAST_CHARACTER_ID);
                  characterContext.updateCharacter(DEFAULT_CHARACTER);
                  router.replace("/" as Href);
                }}
              />
            </View>
          ),
        }}
      />
      <View style={styles.currency}>
        <Text>Copper: {character.data.copper}</Text>
        <Text>Silver: {character.data.silver}</Text>
        <Text>Gold: {character.data.gold}</Text>
        <Text>Platinum: {character.data.platinum}</Text>
      </View>
      <FlatList
        data={storageLocations.data}
        renderItem={({ item }) => <StorageContainer storage={item} />}
        contentContainerStyle={{ gap: Spacing.s }}
        keyExtractor={(item) => item.storage_location_id.toString()}
      />
      <Button
        title="Add Container"
        onPress={async () => {
          await db.insert(storageLocationsTable).values({
            character_id: characterContext.character.id,
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
  container: {
    display: "flex",
    flexDirection: "column",
    gap: Spacing.m,
    marginHorizontal: Spacing.s,
  },
  currency: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});

export default Inventory;
