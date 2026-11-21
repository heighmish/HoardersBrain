import React from "react";
import { FlatList, Pressable, View } from "react-native";
import { storageLocationsTable } from "@/db/schema";
import { useDatabase } from "@/db/DatabaseProvider";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { eq } from "drizzle-orm";
import StorageContainer from "@/components/StorageContainer";
import { Link, router, Stack } from "expo-router";
import { AntDesign } from "@expo/vector-icons";
import { useTheme } from "@/stores/ThemeContext";
import {
  SelectedCharacter,
  useCharacterContext,
} from "@/stores/CharacterContext";
import Currency from "@/components/Currency";
import Carrying from "@/components/Carrying";
import Button from "@/components/Basic/Button";
import ThemedText from "@/components/Basic/ThemedText";

const Inventory = () => {
  const { state } = useCharacterContext();

  if (state.status !== "characterSelected") {
    return null;
  }

  return <InventoryContent character={state.character} />;
};

const InventoryContent = ({ character }: { character: SelectedCharacter }) => {
  const theme = useTheme();
  const db = useDatabase();

  const storageLocations = useLiveQuery(
    db.query.storageLocationsTable.findMany({
      where: eq(storageLocationsTable.character_id, character.id),
    }),
    [character],
  );

  return (
    <View
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        gap: theme.spacing.md,
        marginHorizontal: theme.spacing.sm,
        backgroundColor: theme.colors.background,
      }}
    >
      <Stack.Screen
        options={{
          headerLeft: () => (
            <Link
              href="/ChangeCharacterSheet"
              style={{
                paddingLeft: theme.spacing.sm,
                gap: theme.spacing.xs,
                alignItems: "center",
              }}
              testID="character-switcher"
            >
              <ThemedText
                variant="headline"
                style={{ color: theme.colors.accent }}
              >
                {character.name.slice(0, 25)}{" "}
              </ThemedText>
              <AntDesign name="down" size={12} color={theme.colors.accent} />
            </Link>
          ),
          headerTitle: () => <></>,
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Settings"
              testID="settings-button"
              onPress={() => {
                router.push("/SettingsSheet");
              }}
              style={({ pressed }) => ({
                padding: theme.spacing.sm,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <AntDesign name="setting" size={22} color={theme.colors.accent} />
            </Pressable>
          ),
        }}
      />
      <View
        style={{
          paddingTop: theme.spacing.sm,
          flex: 1,
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-between",
        }}
      >
        <Currency characterId={character.id} />
        <Carrying characterId={character.id} />
      </View>
      <View style={{ flex: 10 }}>
        <FlatList
          data={storageLocations.data}
          renderItem={({ item }) => <StorageContainer storage={item} />}
          contentContainerStyle={{ gap: theme.spacing.sm }}
          keyExtractor={(item) => item.storage_location_id.toString()}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Button
          title="Add Container"
          onPress={() => {
            router.push("/CreateStorageForm");
          }}
          testID="add-container-button"
          fullWidth
        />
      </View>
    </View>
  );
};

export default Inventory;
