import React from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { storageLocationsTable } from "@/db/schema";
import { useDatabase } from "@/db/DatabaseProvider";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { eq } from "drizzle-orm";
import StorageContainer from "@/components/StorageContainer";
import { Link, router, Stack } from "expo-router";
import { AntDesign, FontAwesome5 } from "@expo/vector-icons";
import { useTheme } from "@/stores/ThemeContext";
import {
  SelectedCharacter,
  useCharacterContext,
} from "@/stores/CharacterContext";
import Currency from "@/components/Currency";
import Carrying from "@/components/Carrying";
import Button from "@/components/Basic/Button";

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
              <Text
                style={{
                  color: theme.colors.accent,
                  fontSize: theme.type.headline.fontSize,
                  fontWeight: "600",
                }}
              >
                {character.name.slice(0, 25)}{" "}
              </Text>
              <AntDesign name="down" size={12} color={theme.colors.accent} />
            </Link>
          ),
          headerTitle: () => <></>,
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Theme settings"
              testID="theme-settings-button"
              onPress={() => {
                router.push("/ThemeSettingsSheet");
              }}
              style={({ pressed }) => ({
                padding: theme.spacing.sm,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <FontAwesome5
                name="brain"
                size={22}
                color={theme.colors.accent}
              />
            </Pressable>
          ),
        }}
      />
      <View
        style={{
          paddingTop: theme.spacing.sm,
          display: "flex",
          flexDirection: "column",
          gap: theme.spacing.sm,
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
