import { useTheme } from "@/stores/ThemeContext";
import { Item } from "@/db/schema";
import { View, Text } from "react-native";

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
        <Text style={theme.type.body}>{item.name}</Text>
      </View>
      <View
        style={{
          flexDirection: "row",
          flex: 2,
          gap: theme.spacing.md,
          justifyContent: "flex-end",
        }}
      >
        <Text
          style={[theme.type.body, { fontVariant: ["tabular-nums"] }]}
        >
          {item.quantity}
        </Text>
        <Text
          style={[theme.type.body, { fontVariant: ["tabular-nums"] }]}
        >
          {item.weight}
        </Text>
      </View>
    </View>
  );
};

export default ItemComponent;
