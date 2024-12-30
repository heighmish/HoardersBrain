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
import Currency from "@/components/Currency";

const Inventory = () => {
  const characterContext = useCharacterContext();
  const db = useDatabase();

  const storageLocations = useLiveQuery(
    db.query.storageLocationsTable.findMany({
      where: eq(
        storageLocationsTable.character_id,
        characterContext.character.id,
      ),
    }),
    [characterContext.character],
  );

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
              <Text>{characterContext.character.name.slice(0, 25)} </Text>
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
      <View style={{ flex: 10 }}>
        <FlatList
          data={storageLocations.data}
          renderItem={({ item }) => <StorageContainer storage={item} />}
          contentContainerStyle={{ gap: Spacing.s }}
          keyExtractor={(item) => item.storage_location_id.toString()}
        />
      </View>
      <View style={{ flex: 1 }}>
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
      <View style={{ flex: 1 }}>
        <Currency characterId={characterContext.character.id} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    gap: Spacing.m,
    marginHorizontal: Spacing.s,
  },
});

export default Inventory;
