import ThemedText from "@/components/Basic/ThemedText";
import { useTheme } from "@/stores/ThemeContext";
import { Item } from "@/db/schema";
import { View } from "react-native";

interface ItemProps {
  item: Item;
}

const ItemComponent: React.FC<ItemProps> = ({ item }) => {
  const theme = useTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
      }}
      testID={`item-row-${item.item_id}`}
    >
      <View style={{ flex: 8 }}>
        <ThemedText variant="body">{item.name}</ThemedText>
      </View>
      <View
        style={{
          flexDirection: "row",
          flex: 2,
          gap: theme.spacing.md,
          justifyContent: "flex-end",
        }}
      >
        <ThemedText variant="body" style={{ fontVariant: ["tabular-nums"] }}>
          {item.quantity}
        </ThemedText>
        <ThemedText variant="body" style={{ fontVariant: ["tabular-nums"] }}>
          {item.weight}
        </ThemedText>
      </View>
    </View>
  );
};

export default ItemComponent;
