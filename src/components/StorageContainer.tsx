import ThemedText from "@/components/Basic/ThemedText";
import { Item, Storage, Tag } from "@/db/schema";
import { useLayout } from "@/hooks/useLayout";
import { useInventoryDisplay } from "@/stores/InventoryDisplayContext";
import { useTheme } from "@/stores/ThemeContext";
import { formatWeight } from "@/utils/encumbrance";
import { AntDesign } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import { Pressable, View } from "react-native";
import ItemComponent, { getItemColumnWidths } from "./ItemComponent";

export const DEFAULT_VISIBLE_LIMIT = 5;

export interface StorageContainerHeaderProps {
  storage: Storage;
  itemCount: number;
  effectiveWeight: number;
  isCollapsed: boolean;
  isSearching: boolean;
  onToggleCollapse: () => void;
}

export const StorageContainerHeader: React.FC<StorageContainerHeaderProps> = ({
  storage,
  itemCount,
  effectiveWeight,
  isCollapsed,
  isSearching,
  onToggleCollapse,
}) => {
  const theme = useTheme();
  const { prefs } = useInventoryDisplay();
  const { isCompactWidth, isLargeText, fontScale } = useLayout();
  const colWidths = getItemColumnWidths(isCompactWidth, fontScale);

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
  metaParts.push(itemCount === 1 ? "1 item" : `${itemCount} items`);

  const isStandaloneCard = isCollapsed || itemCount === 0;

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        boxShadow: isStandaloneCard ? theme.shadows.card : undefined,
        borderTopLeftRadius: theme.radius.lg,
        borderTopRightRadius: theme.radius.lg,
        borderBottomLeftRadius: isStandaloneCard ? theme.radius.lg : 0,
        borderBottomRightRadius: isStandaloneCard ? theme.radius.lg : 0,
        borderCurve: "continuous",
        paddingTop: theme.spacing.md,
        paddingHorizontal: theme.spacing.md,
        paddingBottom: isStandaloneCard ? theme.spacing.md : 0,
        marginBottom: isStandaloneCard ? theme.spacing.sm : 0,
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
          onPress={onToggleCollapse}
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

      {isCollapsed ? null : itemCount === 0 ? (
        <ThemedText variant="subhead">No items</ThemedText>
      ) : isLargeText ? null : (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.sm,
            borderBottomWidth: theme.layout.hairline,
            borderColor: theme.colors.border,
            paddingBottom: theme.spacing.xs,
          }}
        >
          <ThemedText
            variant="caption"
            numberOfLines={1}
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
              numberOfLines={1}
              style={{
                width: colWidths.qty,
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
              numberOfLines={1}
              style={{
                width: colWidths.weight,
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
              numberOfLines={1}
              style={{
                width: colWidths.value,
                textAlign: "right",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              Value
            </ThemedText>
          ) : null}
        </View>
      )}
    </View>
  );
};

export interface StorageContainerItemRowProps {
  item: Item;
  tags?: readonly Tag[];
  isLastItem: boolean;
  isCardEnd: boolean;
}

export const StorageContainerItemRow: React.FC<
  StorageContainerItemRowProps
> = ({ item, tags, isLastItem, isCardEnd }) => {
  const theme = useTheme();

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        paddingHorizontal: theme.spacing.md,
        paddingBottom: isCardEnd ? theme.spacing.md : 0,
        borderBottomLeftRadius: isCardEnd ? theme.radius.lg : 0,
        borderBottomRightRadius: isCardEnd ? theme.radius.lg : 0,
        borderCurve: "continuous",
        marginBottom: isCardEnd ? theme.spacing.sm : 0,
      }}
    >
      <ItemComponent item={item} tags={tags} isLast={isLastItem} />
    </View>
  );
};

export interface StorageContainerFooterProps {
  storageId: number;
  hiddenCount: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export const StorageContainerFooter: React.FC<StorageContainerFooterProps> = ({
  storageId,
  hiddenCount,
  isExpanded,
  onToggleExpand,
}) => {
  const theme = useTheme();

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        paddingHorizontal: theme.spacing.md,
        paddingBottom: theme.spacing.md,
        borderBottomLeftRadius: theme.radius.lg,
        borderBottomRightRadius: theme.radius.lg,
        borderCurve: "continuous",
        marginBottom: theme.spacing.sm,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          isExpanded ? "Show fewer items" : `Show ${hiddenCount} more items`
        }
        onPress={onToggleExpand}
        style={({ pressed }) => ({
          opacity: pressed ? 0.7 : 1,
          alignSelf: "flex-start",
          paddingTop: theme.spacing.sm,
        })}
        testID={`container-expand-${storageId}`}
      >
        <ThemedText variant="subhead" style={{ color: theme.colors.accent }}>
          {isExpanded ? "Show fewer" : `Show ${hiddenCount} more`}
        </ThemedText>
      </Pressable>
    </View>
  );
};
