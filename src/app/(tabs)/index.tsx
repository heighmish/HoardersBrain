import React, { useMemo, useReducer } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import type { Item } from "@/db/schema";
import StorageContainer from "@/components/StorageContainer";
import { Link, router, Stack } from "expo-router";
import { AntDesign, Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/stores/ThemeContext";
import {
  SelectedCharacter,
  useCharacterContext,
} from "@/stores/CharacterContext";
import InventorySummaryStrip from "@/components/InventorySummaryStrip";
import Input from "@/components/Basic/Input";
import ThemedText from "@/components/Basic/ThemedText";
import { useCharacterContainers } from "@/hooks/useCharacterContainers";
import { useCharacterItems } from "@/hooks/useCharacterItems";
import { useCharacterItemTags } from "@/hooks/useCharacterItemTags";
import { useCharacterTags } from "@/hooks/useCharacterTags";
import { itemMatchesFilter, TagFilter } from "@/utils/inventoryFilter";

const FLOATING_DOCK_CLEARANCE = 96; // Space for floating search pill + FAB above tab bar

interface SearchState {
  query: string;
  focused: boolean;
  tagFilter: TagFilter;
}

type SearchAction =
  | { type: "SET_QUERY"; query: string }
  | { type: "SET_FOCUSED"; focused: boolean }
  | { type: "TOGGLE_TAG"; tag: Exclude<TagFilter, null> }
  | { type: "CLEAR_TAG" }
  | { type: "CLEAR_ALL" };

const INITIAL_SEARCH_STATE: SearchState = {
  query: "",
  focused: false,
  tagFilter: null,
};

const searchReducer = (
  state: SearchState,
  action: SearchAction,
): SearchState => {
  switch (action.type) {
    case "SET_QUERY":
      return { ...state, query: action.query };
    case "SET_FOCUSED":
      return { ...state, focused: action.focused };
    case "TOGGLE_TAG":
      return {
        ...state,
        tagFilter: state.tagFilter === action.tag ? null : action.tag,
      };
    case "CLEAR_TAG":
      return { ...state, tagFilter: null };
    case "CLEAR_ALL":
      return { ...state, query: "", tagFilter: null };
  }
};

const Inventory = () => {
  const { state } = useCharacterContext();

  if (state.status !== "characterSelected") {
    return null;
  }

  return (
    <InventoryContent key={state.character.id} character={state.character} />
  );
};

const InventoryContent = ({ character }: { character: SelectedCharacter }) => {
  const theme = useTheme();
  const [search, dispatch] = useReducer(searchReducer, INITIAL_SEARCH_STATE);

  const storageLocations = useCharacterContainers(character.id);
  const allItems = useCharacterItems(character.id);
  const allTags = useCharacterTags(character.id);
  const tagsByItemId = useCharacterItemTags(character.id);

  const tagById = useMemo(
    () => new Map(allTags.map((tag) => [tag.tag_id, tag])),
    [allTags],
  );

  // Ignore a tag filter if that tag was deleted in settings.
  const effectiveTagFilter: TagFilter =
    typeof search.tagFilter === "number" && !tagById.has(search.tagFilter)
      ? null
      : search.tagFilter;

  const isFiltering =
    search.query.trim().length > 0 || effectiveTagFilter !== null;

  const activeTagLabel = useMemo(() => {
    if (effectiveTagFilter === null) {
      return null;
    }
    if (effectiveTagFilter === "usable") {
      return "Usable";
    }
    return tagById.get(effectiveTagFilter)?.name ?? null;
  }, [effectiveTagFilter, tagById]);

  const itemsByContainer = useMemo(() => {
    const grouped = new Map<number, Item[]>();
    for (const item of allItems.data) {
      if (isFiltering) {
        const itemTags = tagsByItemId.get(item.item_id) ?? [];
        if (
          !itemMatchesFilter(item, itemTags, tagById, {
            query: search.query,
            tagFilter: effectiveTagFilter,
          })
        ) {
          continue;
        }
      }

      const list = grouped.get(item.storage_location_id) ?? [];
      list.push(item);
      grouped.set(item.storage_location_id, list);
    }
    return grouped;
  }, [
    allItems.data,
    isFiltering,
    search.query,
    effectiveTagFilter,
    tagById,
    tagsByItemId,
  ]);

  const visibleContainers = useMemo(() => {
    if (!isFiltering) {
      return storageLocations.data;
    }
    return storageLocations.data.filter(
      (container) =>
        (itemsByContainer.get(container.storage_location_id)?.length ?? 0) > 0,
    );
  }, [isFiltering, itemsByContainer, storageLocations.data]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{
        flex: 1,
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
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: theme.spacing.xs,
              }}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Inventory display options"
                testID="inventory-display-button"
                onPress={() => {
                  router.push("/InventoryDisplaySheet");
                }}
                style={({ pressed }) => ({
                  padding: theme.spacing.sm,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Ionicons
                  name="options-outline"
                  size={22}
                  color={theme.colors.accent}
                />
              </Pressable>
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
                <AntDesign
                  name="setting"
                  size={22}
                  color={theme.colors.accent}
                />
              </Pressable>
            </View>
          ),
        }}
      />

      <FlatList
        data={visibleContainers}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={
          <InventorySummaryStrip
            characterId={character.id}
            items={allItems.data}
            containers={storageLocations.data}
            encumbranceReady={allItems.isReady && storageLocations.isReady}
          />
        }
        renderItem={({ item }) => (
          <StorageContainer
            storage={item}
            items={itemsByContainer.get(item.storage_location_id) ?? []}
            tagsByItemId={tagsByItemId}
            isSearching={isFiltering}
          />
        )}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.sm,
          paddingTop: theme.spacing.sm,
          paddingBottom: search.focused
            ? FLOATING_DOCK_CLEARANCE + 44
            : FLOATING_DOCK_CLEARANCE,
          gap: theme.spacing.sm,
        }}
        keyExtractor={(item) => item.storage_location_id.toString()}
        ListEmptyComponent={
          isFiltering ? (
            <ThemedText
              variant="subhead"
              style={{
                textAlign: "center",
                paddingVertical: theme.spacing.lg,
              }}
            >
              No matching items
            </ThemedText>
          ) : undefined
        }
        ListFooterComponent={
          isFiltering ? undefined : (
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
              <ThemedText
                variant="subhead"
                style={{ color: theme.colors.textMuted }}
              >
                Add Container
              </ThemedText>
            </Pressable>
          )
        }
      />

      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          left: theme.spacing.sm,
          right: theme.spacing.sm,
          bottom: theme.spacing.md,
          gap: theme.spacing.sm,
        }}
      >
        {search.focused ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            contentContainerStyle={{
              gap: theme.spacing.xs,
              paddingHorizontal: theme.spacing.xs,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: search.tagFilter === "usable" }}
              onPress={() => dispatch({ type: "TOGGLE_TAG", tag: "usable" })}
              style={({ pressed }) => ({
                backgroundColor:
                  search.tagFilter === "usable"
                    ? theme.colors.accent
                    : theme.colors.surface,
                borderColor:
                  search.tagFilter === "usable"
                    ? theme.colors.accent
                    : theme.colors.border,
                borderWidth: 1,
                borderRadius: theme.radius.full,
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.xs,
                boxShadow: theme.shadows.card,
                opacity: pressed ? 0.7 : 1,
              })}
              testID="filter-tag-usable"
            >
              <ThemedText
                variant="caption"
                style={{
                  color:
                    search.tagFilter === "usable"
                      ? theme.colors.accentText
                      : theme.colors.text,
                  fontWeight: "600",
                }}
              >
                Usable
              </ThemedText>
            </Pressable>
            {allTags.map((tag) => {
              const selected = search.tagFilter === tag.tag_id;
              return (
                <Pressable
                  key={`filter-tag-${tag.tag_id}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() =>
                    dispatch({ type: "TOGGLE_TAG", tag: tag.tag_id })
                  }
                  style={({ pressed }) => ({
                    backgroundColor: selected
                      ? theme.colors.accent
                      : theme.colors.surface,
                    borderColor: selected
                      ? theme.colors.accent
                      : theme.colors.border,
                    borderWidth: 1,
                    borderRadius: theme.radius.full,
                    paddingHorizontal: theme.spacing.md,
                    paddingVertical: theme.spacing.xs,
                    boxShadow: theme.shadows.card,
                    opacity: pressed ? 0.7 : 1,
                  })}
                  testID={`filter-tag-${tag.name.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <ThemedText
                    variant="caption"
                    style={{
                      color: selected
                        ? theme.colors.accentText
                        : theme.colors.text,
                      fontWeight: "600",
                    }}
                  >
                    {tag.name}
                  </ThemedText>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        <View
          pointerEvents="box-none"
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
          }}
        >
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              gap: theme.spacing.xs,
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              borderWidth: 1,
              borderRadius: theme.radius.full,
              paddingHorizontal: theme.spacing.md,
              minHeight: 48,
              boxShadow: theme.shadows.raised,
            }}
          >
            <Ionicons
              name="search-outline"
              size={18}
              color={theme.colors.textMuted}
            />
            {activeTagLabel !== null ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Clear ${activeTagLabel} filter`}
                onPress={() => dispatch({ type: "CLEAR_TAG" })}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: theme.spacing.xs,
                  backgroundColor: theme.colors.accent,
                  borderRadius: theme.radius.full,
                  paddingHorizontal: theme.spacing.sm,
                  paddingVertical: 2, // Compact active chip inside pill
                  opacity: pressed ? 0.7 : 1,
                })}
                testID="active-tag-filter-chip"
              >
                <ThemedText
                  variant="caption"
                  style={{
                    color: theme.colors.accentText,
                    fontWeight: "600",
                  }}
                >
                  {activeTagLabel}
                </ThemedText>
                <AntDesign
                  name="close"
                  size={10}
                  color={theme.colors.accentText}
                />
              </Pressable>
            ) : null}
            <Input
              placeholder={
                activeTagLabel !== null ? "Filter..." : "Search items or tags"
              }
              value={search.query}
              onChangeText={(query) => dispatch({ type: "SET_QUERY", query })}
              onFocus={() => dispatch({ type: "SET_FOCUSED", focused: true })}
              onBlur={() => dispatch({ type: "SET_FOCUSED", focused: false })}
              returnKeyType="search"
              testID="inventory-search-input"
              style={{
                flex: 1,
                borderWidth: 0,
                backgroundColor: "transparent",
                paddingHorizontal: 0,
                paddingVertical: theme.spacing.xs,
              }}
            />
            {isFiltering ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                onPress={() => dispatch({ type: "CLEAR_ALL" })}
                hitSlop={8}
                style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
                testID="inventory-search-clear"
              >
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={theme.colors.textMuted}
                />
              </Pressable>
            ) : null}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add Item"
            testID="fab-add-item"
            onPress={() => {
              router.push("/CreateItemForm");
            }}
            style={({ pressed }) => ({
              width: 52,
              height: 52,
              borderRadius: theme.radius.full,
              backgroundColor: theme.colors.accent,
              alignItems: "center",
              justifyContent: "center",
              boxShadow: theme.shadows.raised,
              opacity: pressed ? 0.7 : 1,
            })}
          >
            <AntDesign
              name="plus"
              size={24}
              color={theme.colors.accentText}
            />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default Inventory;
