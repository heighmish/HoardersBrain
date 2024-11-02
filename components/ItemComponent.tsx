import { Item } from "@/db/schema";
import { View, Text } from "react-native";

interface ItemProps {
  item: Item;
}

const ItemComponent: React.FC<ItemProps> = ({ item }) => {
  return (
    <View>
      <Text>{item.name}</Text>
    </View>
  );
};

export default ItemComponent;
