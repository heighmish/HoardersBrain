import ThemedText from "@/components/Basic/ThemedText";
import { Item, Storage, Tag } from "@/db/schema";
import { useInventoryDisplay } from "@/stores/InventoryDisplayContext";
import { useTheme } from "@/stores/ThemeContext";
import { AntDesign } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import { Pressable, View } from "react-native";
import ItemComponent, {
  ITEM_QTY_COLUMN_WIDTH,
  ITEM_VALUE_COLUMN_WIDTH,
  ITEM_WEIGHT_COLUMN_WIDTH,
} from "./ItemComponent";

interface StorageContainerProps {
  storage: Storage;
  items: readonly Item[];
  tagsByItemId?: ReadonlyMap<number, Tag[]>;
  isSearching?: boolean;
}

const formatWeight = (value: number): string => String(Number(value.toFixed(2)));

const StorageContainer: React.FC<StorageContainerProps> = ({
  storage,
  items,
  tagsByItemId,
  isSearching = false,
}) => {
  const theme = useTheme();
  const { prefs } = useInventoryDisplay();

  const [collapsed, setCollapsed] = useState(!storage.carrying);
  const [expanded, setExpanded] = useState(false);

  const isCollapsed = !isSearching && collapsed;
  const visibleItems =
    isSearching || expanded ? items : items.slice(0, 5);

  const contentsWeight = items.reduce(
    (sum, item) => sum + item.weight * item.quantity,
    0,
  );
  const effectiveWeight = storage.is_fixed_weight
    ? storage.weight
    : storage.weight + contentsWeight;

  const metaParts: string[] = [];
  if (prefs.showWeight) {
    metaParts.push(`Weight ${formatWeight(effectiveWeight)}`);
  }
  if (storage.is_fixed_weight) {
    metaParts.push("Fixed");
  }
  if (!storage.carrying) {
    metaParts.push("Stowed");
  }
  metaParts.push(items.length === 1 ? "1 item" : `${items.length} items`);

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        boxShadow: theme.shadows.card,
        borderRadius: theme.radius.lg,
        borderCurve: "continuous",
        padding: theme.spacing.md,
      }}
      testID={`container-card-${storage.storage_location_id}`}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          gap: theme.spacing.sm,
          marginBottom: isCollapsed ? 0 : theme.spacing.sm,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: !isCollapsed }}
          accessibilityLabel={
            isCollapsed
              ? `Expand ${storage.name}`
              : `Collapse ${storage.name}`
          }
          disabled={isSearching}
          onPress={() => setCollapsed((prev) => !prev)}
          style={({ pressed }) => ({
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
            opacity: !isSearching && pressed ? 0.7 : 1,
          })}
          testID={`container-collapse-${storage.storage_location_id}`}
        >
          <AntDesign
            name={isCollapsed ? "right" : "down"}
            size={12}
            color={theme.colors.textMuted}
          />
          <View style={{ flex: 1, gap: theme.spacing.xs }}>
            <ThemedText variant="headline" numberOfLines={1}>
              {storage.name}
            </ThemedText>
            <ThemedText
              variant="caption"
              numberOfLines={1}
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {metaParts.join(" · ")}
            </ThemedText>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Container options"
          onPress={() => {
            router.push({
              pathname: "/ContainerMenuSheet",
              params: {
                storageId: storage.storage_location_id,
              },
            });
          }}
          style={({ pressed }) => ({
            padding: theme.spacing.sm,
            margin: -theme.spacing.sm,
            opacity: pressed ? 0.6 : 1,
          })}
          testID={`container-menu-${storage.storage_location_id}`}
        >
          <AntDesign
            name="ellipsis"
            size={20}
            color={theme.colors.textMuted}
          />
        </Pressable>
      </View>

      {isCollapsed ? null : (
        <>
          {items.length === 0 ? (
            <ThemedText variant="subhead">No items</ThemedText>
          ) : (
            <>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: theme.spacing.sm,
                  borderBottomWidth: 1,
                  borderColor: theme.colors.border,
                  paddingBottom: theme.spacing.xs,
                }}
              >
                <ThemedText
                  variant="caption"
                  style={{
                    flex: 1,
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                  }}
                >
                  Name
                </ThemedText>
                {prefs.showQuantity ? (
                  <ThemedText
                    variant="caption"
                    style={{
                      width: ITEM_QTY_COLUMN_WIDTH,
                      textAlign: "right",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Qty
                  </ThemedText>
                ) : null}
                {prefs.showWeight ? (
                  <ThemedText
                    variant="caption"
                    style={{
                      width: ITEM_WEIGHT_COLUMN_WIDTH,
                      textAlign: "right",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Weight
                  </ThemedText>
                ) : null}
                {prefs.showValue ? (
                  <ThemedText
                    variant="caption"
                    style={{
                      width: ITEM_VALUE_COLUMN_WIDTH,
                      textAlign: "right",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Value
                  </ThemedText>
                ) : null}
              </View>
              <View>
                {visibleItems.map((item, index) => (
                  <ItemComponent
                    key={item.item_id}
                    item={item}
                    tags={tagsByItemId?.get(item.item_id)}
                    isLast={index === visibleItems.length - 1}
                  />
                ))}
              </View>
            </>
          )}

          {!isSearching && items.length > 5 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                expanded
                  ? "Show fewer items"
                  : `Show ${items.length - 5} more items`
              }
              onPress={() => {
                setExpanded((prev) => !prev);
              }}
              style={({ pressed }) => ({
                opacity: pressed ? 0.7 : 1,
                alignSelf: "flex-start",
                paddingTop: theme.spacing.sm,
              })}
              testID={`container-expand-${storage.storage_location_id}`}
            >
              <ThemedText
                variant="subhead"
                style={{ color: theme.colors.accent }}
              >
                {expanded ? "Show fewer" : `Show ${items.length - 5} more`}
              </ThemedText>
            </Pressable>
          ) : null}
        </>
      )}
    </View>
  );
};

export default StorageContainer;
