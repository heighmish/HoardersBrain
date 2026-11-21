import ThemedText from "@/components/Basic/ThemedText";
import { useTheme } from "@/stores/ThemeContext";
import { Item } from "@/db/schema";
import { router } from "expo-router";
import { Pressable, View } from "react-native";

interface ItemProps {
  item: Item;
}

const ItemComponent: React.FC<ItemProps> = ({ item }) => {
  const theme = useTheme();

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
        justifyContent: "space-between",
        opacity: pressed ? 0.7 : 1,
      })}
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
    </Pressable>
  );
};

export default ItemComponent;
