import React from "react";
import { FlatList, Pressable, View } from "react-native";
import { storageLocationsTable } from "@/db/schema";
import { useDatabase } from "@/db/DatabaseProvider";
import { useLiveQuery } from "drizzle-orm/expo-sqlite";
import { and, eq, isNull } from "drizzle-orm";
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
      where: and(
        eq(storageLocationsTable.character_id, character.id),
        isNull(storageLocationsTable.deleted_at),
      ),
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
                router.push("/Settings");
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
          contentContainerStyle={{
            gap: theme.spacing.sm,
            paddingBottom: theme.spacing.xxl,
          }}
          keyExtractor={(item) => item.storage_location_id.toString()}
          ListFooterComponent={
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                router.push("/CreateStorageForm");
              }}
              style={({ pressed }) => ({
                opacity: pressed ? 0.6 : 1,
                paddingVertical: theme.spacing.md,
              })}
              testID="add-container-button"
            >
              <ThemedText variant="subhead" style={{ color: theme.colors.textMuted }}>
                Add Container
              </ThemedText>
            </Pressable>
          }
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add Item"
        testID="fab-add-item"
        onPress={() => {
          router.push("/CreateItemForm");
        }}
        style={({ pressed }) => ({
          position: "absolute",
          bottom: theme.spacing.lg,
          right: theme.spacing.lg,
          width: 56,
          height: 56,
          borderRadius: theme.radius.full,
          backgroundColor: theme.colors.accent,
          alignItems: "center",
          justifyContent: "center",
          boxShadow: theme.shadows.raised,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <AntDesign name="plus" size={24} color={theme.colors.accentText} />
      </Pressable>
    </View>
  );
};

export default Inventory;
