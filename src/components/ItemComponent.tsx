import ThemedText from "@/components/Basic/ThemedText";
import { rarityColors } from "@/constants/rarity";
import { useDatabase } from "@/db/DatabaseProvider";
import { useOneFromItem } from "@/db/repositories";
import { Item, Tag } from "@/db/schema";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { useInventoryDisplay } from "@/stores/InventoryDisplayContext";
import { useTheme } from "@/stores/ThemeContext";
import { router } from "expo-router";
import { Pressable, View } from "react-native";

export const ITEM_QTY_COLUMN_WIDTH = 44;
export const ITEM_WEIGHT_COLUMN_WIDTH = 56;
export const ITEM_VALUE_COLUMN_WIDTH = 64;

const MAX_INLINE_TAGS = 2;

const formatWeight = (value: number): string => String(Number(value.toFixed(2)));

interface ItemProps {
  item: Item;
  tags?: readonly Tag[];
  isLast?: boolean;
}

const ItemComponent: React.FC<ItemProps> = ({
  item,
  tags = [],
  isLast = false,
}) => {
  const theme = useTheme();
  const db = useDatabase();
  const { prefs } = useInventoryDisplay();
  const useAction = useAsyncAction();

  const hasRarityAccent = prefs.showRarity && item.rarity !== "Common";
  const isUsable = prefs.showQuickUse && tags.some((tag) => tag.is_usable);
  const visibleTags = prefs.showTags ? tags.slice(0, MAX_INLINE_TAGS) : [];
  const valueLabel =
    item.value !== null && item.value_currency !== null
      ? `${item.value} ${item.value_currency}`
      : "—";
  const totalWeight = formatWeight(item.weight * item.quantity);

  return (
    <Pressable
      accessible={false}
      onPress={() => {
        router.push({
          pathname: "/ItemDetail",
          params: { itemId: item.item_id },
        });
      }}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.sm,
        paddingVertical: theme.spacing.sm,
        minHeight: 44,
        borderBottomWidth: isLast ? 0 : 1,
        borderColor: theme.colors.border,
        opacity: pressed ? 0.7 : 1,
      })}
      testID={`item-row-${item.item_id}`}
    >
      <View style={{ flex: 1, gap: theme.spacing.xs }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: theme.spacing.xs,
          }}
        >
          {hasRarityAccent ? (
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: theme.radius.full,
                backgroundColor: rarityColors[item.rarity],
              }}
            />
          ) : null}
          <ThemedText
            variant="body"
            numberOfLines={1}
            style={{ flexShrink: 1 }}
          >
            {item.name}
          </ThemedText>
        </View>
        {visibleTags.length > 0 ? (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "center",
              gap: theme.spacing.xs,
            }}
          >
            {visibleTags.map((tag) => (
              <View
                key={`row-tag-${item.item_id}-${tag.tag_id}`}
                style={{
                  backgroundColor: theme.colors.background,
                  borderRadius: theme.radius.sm,
                  paddingHorizontal: theme.spacing.xs,
                  paddingVertical: 2, // Compact chip vertical rhythm below xs (4)
                }}
              >
                <ThemedText variant="caption" numberOfLines={1}>
                  {tag.name}
                </ThemedText>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {isUsable ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Use one ${item.name}`}
          disabled={useAction.submitting}
          hitSlop={6}
          onPress={(event) => {
            event.stopPropagation();
            void useAction.run(
              () => useOneFromItem(db, item.item_id),
              "Failed to use item.",
            );
          }}
          style={({ pressed }) => ({
            borderWidth: 1,
            borderColor: theme.colors.accent,
            borderRadius: theme.radius.full,
            paddingHorizontal: theme.spacing.sm,
            paddingVertical: theme.spacing.xs,
            opacity: useAction.submitting ? 0.4 : pressed ? 0.7 : 1,
          })}
          testID={`item-quick-use-${item.item_id}`}
        >
          <ThemedText
            variant="caption"
            style={{
              color: theme.colors.accent,
              fontWeight: "600",
              fontVariant: ["tabular-nums"],
            }}
          >
            -1
          </ThemedText>
        </Pressable>
      ) : null}

      {prefs.showQuantity ? (
        <ThemedText
          variant="body"
          numberOfLines={1}
          style={{
            width: ITEM_QTY_COLUMN_WIDTH,
            textAlign: "right",
            fontVariant: ["tabular-nums"],
          }}
        >
          {item.quantity}
        </ThemedText>
      ) : null}

      {prefs.showWeight ? (
        <ThemedText
          variant="body"
          numberOfLines={1}
          style={{
            width: ITEM_WEIGHT_COLUMN_WIDTH,
            textAlign: "right",
            color: theme.colors.textMuted,
            fontVariant: ["tabular-nums"],
          }}
        >
          {totalWeight}
        </ThemedText>
      ) : null}

      {prefs.showValue ? (
        <ThemedText
          variant="body"
          numberOfLines={1}
          style={{
            width: ITEM_VALUE_COLUMN_WIDTH,
            textAlign: "right",
            color: theme.colors.textMuted,
            fontVariant: ["tabular-nums"],
          }}
        >
          {valueLabel}
        </ThemedText>
      ) : null}
    </Pressable>
  );
};

export default ItemComponent;
