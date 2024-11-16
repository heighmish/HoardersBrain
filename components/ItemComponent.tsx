import { Spacing, defaultStyles } from "@/constants/Styles";
import { Item } from "@/db/schema";
import { View, Text } from "react-native";

interface ItemProps {
  item: Item;
}

const ItemComponent: React.FC<ItemProps> = ({ item }) => {
  return (
    <View
      style={[
        defaultStyles.flexRow,
        {
          justifyContent: "space-between",
        },
      ]}
    >
      <View style={{ flex: 8 }}>
        <Text>{item.name}</Text>
      </View>
      <View
        style={[
          defaultStyles.flexRow,
          { flex: 2, gap: Spacing.m, backgroundColor: "green" },
        ]}
      >
        <Text>{item.quantity}</Text>
        <Text>{item.weight}</Text>
      </View>
    </View>
  );
};

export default ItemComponent;
