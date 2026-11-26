import React, { useDeferredValue, useMemo, useReducer, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import type { Item, Storage } from "@/db/schema";
import {
  DEFAULT_VISIBLE_LIMIT,
  StorageContainerFooter,
  StorageContainerHeader,
  StorageContainerItemRow,
} from "@/components/StorageContainer";
import { router, Stack } from "expo-router";
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

const DEFAULT_DOCK_CLEARANCE = 96; // Initial bottom clearance before floating dock onLayout measures it
const FAB_SIZE = 52; // Floating action button and Add Container row height
const SEARCH_PILL_MIN_HEIGHT = 48; // Floating search pill minimum touch height

type InventoryRow =
  | {
      key: string;
      type: "container-header";
      storage: Storage;
      itemCount: number;
      effectiveWeight: number;
      isCollapsed: boolean;
    }
  | {
      key: string;
      type: "item";
      item: Item;
      isLastItem: boolean;
      isCardEnd: boolean;
    }
  | {
      key: string;
      type: "container-footer";
      storageId: number;
      hiddenCount: number;
      isExpanded: boolean;
    };

interface InventoryUiState {
  query: string;
  focused: boolean;
  tagFilter: TagFilter;
  collapsed: Record<number, boolean>;
  expanded: Record<number, boolean>;
}

type InventoryUiAction =
  | { type: "SET_QUERY"; query: string }
  | { type: "SET_FOCUSED"; focused: boolean }
  | { type: "TOGGLE_TAG"; tag: Exclude<TagFilter, null> }
  | { type: "CLEAR_TAG" }
  | { type: "CLEAR_ALL" }
  | { type: "TOGGLE_COLLAPSE"; storageId: number; currentCollapsed: boolean }
  | { type: "TOGGLE_EXPAND"; storageId: number };

const INITIAL_UI_STATE: InventoryUiState = {
  query: "",
  focused: false,
  tagFilter: null,
  collapsed: {},
  expanded: {},
};

const inventoryUiReducer = (
  state: InventoryUiState,
  action: InventoryUiAction,
): InventoryUiState => {
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
    case "TOGGLE_COLLAPSE":
      return {
        ...state,
        collapsed: {
          ...state.collapsed,
          [action.storageId]: !action.currentCollapsed,
        },
      };
    case "TOGGLE_EXPAND":
      return {
        ...state,
        expanded: {
          ...state.expanded,
          [action.storageId]: !state.expanded[action.storageId],
        },
      };
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
  const [ui, dispatch] = useReducer(inventoryUiReducer, INITIAL_UI_STATE);
  const [dockHeight, setDockHeight] = useState(DEFAULT_DOCK_CLEARANCE);
  const effectiveQuery = useDeferredValue(ui.query);

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
    typeof ui.tagFilter === "number" && !tagById.has(ui.tagFilter)
      ? null
      : ui.tagFilter;

  const isFiltering =
    effectiveQuery.trim().length > 0 || effectiveTagFilter !== null;
  const hasSearchInput = ui.query.length > 0 || effectiveTagFilter !== null;

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
            query: effectiveQuery,
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
    effectiveQuery,
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

  const flatRows = useMemo<InventoryRow[]>(() => {
    const rows: InventoryRow[] = [];

    for (const storage of visibleContainers) {
      const storageId = storage.storage_location_id;
      const items = itemsByContainer.get(storageId) ?? [];
      const isCollapsed =
        !isFiltering && (ui.collapsed[storageId] ?? !storage.carrying);

      const contentsWeight = items.reduce(
        (sum, item) => sum + item.weight * item.quantity,
        0,
      );
      const effectiveWeight = storage.is_fixed_weight
        ? storage.weight
        : storage.weight + contentsWeight;

      rows.push({
        key: `header-${storageId}`,
        type: "container-header",
        storage,
        itemCount: items.length,
        effectiveWeight,
        isCollapsed,
      });

      if (isCollapsed || items.length === 0) {
        continue;
      }

      const isExpanded = Boolean(ui.expanded[storageId]);
      const visibleItems =
        isFiltering || isExpanded
          ? items
          : items.slice(0, DEFAULT_VISIBLE_LIMIT);
      const hasFooter = !isFiltering && items.length > DEFAULT_VISIBLE_LIMIT;

      visibleItems.forEach((item, i) => {
        const isLastItem = i === visibleItems.length - 1;
        rows.push({
          key: `item-${item.item_id}`,
          type: "item",
          item,
          isLastItem,
          isCardEnd: isLastItem && !hasFooter,
        });
      });

      if (hasFooter) {
        rows.push({
          key: `footer-${storageId}`,
          type: "container-footer",
          storageId,
          hiddenCount: items.length - DEFAULT_VISIBLE_LIMIT,
          isExpanded,
        });
      }
    }

    return rows;
  }, [
    isFiltering,
    itemsByContainer,
    ui.collapsed,
    ui.expanded,
    visibleContainers,
  ]);

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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={character.name}
              testID="character-switcher"
              onPress={() => {
                router.push("/ChangeCharacterSheet");
              }}
              style={({ pressed }) => ({
                paddingLeft: theme.spacing.sm,
                maxWidth: 220, // Keeps switcher clear of headerRight icons on narrow screens
                flexDirection: "row",
                alignItems: "center",
                gap: theme.spacing.xs,
                opacity: pressed ? theme.opacity.pressed : 1,
              })}
            >
              <ThemedText
                variant="headline"
                numberOfLines={1}
                // Cap Dynamic Type inside the fixed-height native nav bar to prevent vertical clipping.
                maxFontSizeMultiplier={1.35}
                style={{ color: theme.colors.accent, flexShrink: 1 }}
              >
                {character.name}
              </ThemedText>
              <AntDesign
                name="down"
                size={theme.layout.icon.xs}
                color={theme.colors.accent}
              />
            </Pressable>
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
        data={flatRows}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        initialNumToRender={16}
        maxToRenderPerBatch={12}
        windowSize={7}
        ListHeaderComponent={
          <View style={{ marginBottom: theme.spacing.sm }}>
            <InventorySummaryStrip
              characterId={character.id}
              items={allItems.data}
              containers={storageLocations.data}
              encumbranceReady={allItems.isReady && storageLocations.isReady}
            />
          </View>
        }
        renderItem={({ item: row }) => {
          switch (row.type) {
            case "container-header":
              return (
                <StorageContainerHeader
                  storage={row.storage}
                  itemCount={row.itemCount}
                  effectiveWeight={row.effectiveWeight}
                  isCollapsed={row.isCollapsed}
                  isSearching={isFiltering}
                  onToggleCollapse={() =>
                    dispatch({
                      type: "TOGGLE_COLLAPSE",
                      storageId: row.storage.storage_location_id,
                      currentCollapsed: row.isCollapsed,
                    })
                  }
                />
              );
            case "item":
              return (
                <StorageContainerItemRow
                  item={row.item}
                  tags={tagsByItemId.get(row.item.item_id)}
                  isLastItem={row.isLastItem}
                  isCardEnd={row.isCardEnd}
                />
              );
            case "container-footer":
              return (
                <StorageContainerFooter
                  storageId={row.storageId}
                  hiddenCount={row.hiddenCount}
                  isExpanded={row.isExpanded}
                  onToggleExpand={() =>
                    dispatch({
                      type: "TOGGLE_EXPAND",
                      storageId: row.storageId,
                    })
                  }
                />
              );
          }
        }}
        contentContainerStyle={{
          paddingHorizontal: theme.spacing.sm,
          paddingTop: theme.spacing.sm,
          paddingBottom: dockHeight + theme.spacing.md,
        }}
        keyExtractor={(row) => row.key}
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
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: theme.spacing.sm,
                minHeight: FAB_SIZE,
                paddingVertical: theme.spacing.md,
                paddingHorizontal: theme.spacing.md,
                borderRadius: theme.radius.lg,
                borderCurve: "continuous",
                borderWidth: 1.5,
                borderStyle: "dashed",
                borderColor: theme.colors.border,
                opacity: pressed ? 0.7 : 1,
              })}
              testID="add-container-button"
            >
              <AntDesign name="plus" size={16} color={theme.colors.accent} />
              <ThemedText
                variant="subhead"
                style={{
                  color: theme.colors.accent,
                  fontWeight: "600",
                  flexShrink: 1,
                  textAlign: "center",
                }}
              >
                Add Container
              </ThemedText>
            </Pressable>
          )
        }
      />

      <View
        pointerEvents="box-none"
        onLayout={(event) => {
          const measured = Math.ceil(event.nativeEvent.layout.height);
          if (measured > 0 && measured !== dockHeight) {
            setDockHeight(measured);
          }
        }}
        style={{
          position: "absolute",
          left: theme.spacing.sm,
          right: theme.spacing.sm,
          bottom: theme.spacing.md,
          gap: theme.spacing.sm,
        }}
      >
        {ui.focused ? (
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
              accessibilityState={{ selected: ui.tagFilter === "usable" }}
              onPress={() => dispatch({ type: "TOGGLE_TAG", tag: "usable" })}
              style={({ pressed }) => ({
                backgroundColor:
                  ui.tagFilter === "usable"
                    ? theme.colors.accent
                    : theme.colors.surface,
                borderColor:
                  ui.tagFilter === "usable"
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
                    ui.tagFilter === "usable"
                      ? theme.colors.accentText
                      : theme.colors.text,
                  fontWeight: "600",
                }}
              >
                Usable
              </ThemedText>
            </Pressable>
            {allTags.map((tag) => {
              const selected = ui.tagFilter === tag.tag_id;
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
              minHeight: SEARCH_PILL_MIN_HEIGHT,
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
              value={ui.query}
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
            {hasSearchInput ? (
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
              width: FAB_SIZE,
              height: FAB_SIZE,
              borderRadius: theme.radius.full,
              backgroundColor: theme.colors.accent,
              alignItems: "center",
              justifyContent: "center",
              boxShadow: theme.shadows.raised,
              opacity: pressed ? theme.opacity.pressed : 1,
            })}
          >
            <AntDesign
              name="plus"
              size={theme.layout.icon.lg}
              color={theme.colors.accentText}
            />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

export default Inventory;
