import ThemedText from "@/components/Basic/ThemedText";
import { rarityColors } from "@/constants/rarity";
import { useDatabase } from "@/db/DatabaseProvider";
import { useOneFromItem } from "@/db/repositories";
import { Item, Tag } from "@/db/schema";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { useLayout } from "@/hooks/useLayout";
import { useInventoryDisplay } from "@/stores/InventoryDisplayContext";
import { useTheme } from "@/stores/ThemeContext";
import { formatWeight } from "@/utils/encumbrance";
import { router } from "expo-router";
import { Pressable, View } from "react-native";

export const getItemColumnWidths = (
  isCompactWidth: boolean,
  fontScale: number,
) => {
  const scale = Math.max(1, Math.min(fontScale, 1.5));
  const base = isCompactWidth
    ? { qty: 40, weight: 50, value: 58 }
    : { qty: 44, weight: 56, value: 64 };
  return {
    qty: Math.round(base.qty * scale),
    weight: Math.round(base.weight * scale),
    value: Math.round(base.value * scale),
  };
};

const MAX_INLINE_TAGS = 2;

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
  const { isCompactWidth, isLargeText, fontScale } = useLayout();
  const useAction = useAsyncAction();
  const colWidths = getItemColumnWidths(isCompactWidth, fontScale);

  const hasRarityAccent = prefs.showRarity && item.rarity !== "Common";
  const isUsable = prefs.showQuickUse && tags.some((tag) => tag.is_usable);
  const visibleTags = prefs.showTags ? tags.slice(0, MAX_INLINE_TAGS) : [];
  const valueLabel =
    item.value !== null && item.value_currency !== null
      ? `${item.value} ${item.value_currency}`
      : "—";
  const totalWeight = formatWeight(item.weight * item.quantity);

  const compactMetaParts: string[] = [];
  if (isLargeText) {
    if (prefs.showQuantity) {
      compactMetaParts.push(`Qty ${item.quantity}`);
    }
    if (prefs.showWeight) {
      compactMetaParts.push(`Weight ${totalWeight}`);
    }
    if (
      prefs.showValue &&
      item.value !== null &&
      item.value_currency !== null
    ) {
      compactMetaParts.push(valueLabel);
    }
  }

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
        position: "relative",
        flexDirection: "row",
        alignItems: "center",
        gap: theme.spacing.sm,
        paddingVertical: theme.spacing.sm,
        minHeight: theme.layout.touchMin,
        borderBottomWidth: isLast ? 0 : theme.layout.hairline,
        borderColor: theme.colors.border,
        opacity: pressed ? theme.opacity.pressed : 1,
      })}
      testID={`item-row-${item.item_id}`}
    >
      {hasRarityAccent ? (
        <View
          style={{
            position: "absolute",
            left: -10, // Hangs in the card's 16px left padding so item names stay flush-left
            top: theme.spacing.sm,
            bottom: theme.spacing.sm,
            width: 3,
            borderRadius: theme.radius.full,
            backgroundColor: rarityColors[item.rarity],
          }}
        />
      ) : null}
      <View style={{ flex: 1, gap: theme.spacing.xs }}>
        <ThemedText
          variant="subhead"
          numberOfLines={isLargeText ? 3 : 2}
          style={{ color: theme.colors.text }}
        >
          {item.name}
        </ThemedText>
        {isLargeText && compactMetaParts.length > 0 ? (
          <ThemedText
            variant="caption"
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {compactMetaParts.join(" · ")}
          </ThemedText>
        ) : null}
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
            opacity: useAction.submitting
              ? theme.opacity.disabled
              : pressed
                ? theme.opacity.pressed
                : 1,
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

      {!isLargeText && prefs.showQuantity ? (
        <ThemedText
          variant="subhead"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          style={{
            width: colWidths.qty,
            textAlign: "right",
            color: theme.colors.text,
            fontVariant: ["tabular-nums"],
          }}
        >
          {item.quantity}
        </ThemedText>
      ) : null}

      {!isLargeText && prefs.showWeight ? (
        <ThemedText
          variant="subhead"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          style={{
            width: colWidths.weight,
            textAlign: "right",
            color: theme.colors.textMuted,
            fontVariant: ["tabular-nums"],
          }}
        >
          {totalWeight}
        </ThemedText>
      ) : null}

      {!isLargeText && prefs.showValue ? (
        <ThemedText
          variant="subhead"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          style={{
            width: colWidths.value,
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
